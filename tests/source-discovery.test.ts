import { describe, expect, test } from "bun:test";
import { codexEnvironment, getAiSettings, getCompatibleSettings, isAiEnabled, needsTerraReview, parseAiScore, requestAiScore, reviewModel, setAiEnabled, setAiSettings, setCompatibleSettings } from "@/server/ai";
import { getSetting, setSetting } from "@/server/db";
import { automationEnabled } from "@/server/pipeline";
import { hybridOpportunityScore } from "@/server/scoring";
import { extractDiscoveryEvidence, mergeEvidence, nextSourceState, sourceDueForScoring } from "@/server/sources";

describe("source discovery and AI lifecycle", () => {
  test("extracts and weights quote, reply and mention accounts without the parent", () => {
    const evidence = extractDiscoveryEvidence("seed", {
      quote: { author: { screen_name: "QuotedNews" } },
      replying_to: { screen_name: "ReplyNews" },
      raw_text: { facets: [
        { type: "mention", original: "@MentionedNews" },
        { type: "mention", original: "@seed" },
      ] },
    });

    expect(evidence).toEqual([
      { handle: "quotednews", weight: 3, parentHandles: ["seed"] },
      { handle: "replynews", weight: 2, parentHandles: ["seed"] },
      { handle: "mentionednews", weight: 1, parentHandles: ["seed"] },
    ]);
  });

  test("merges discovery evidence and requires three low rounds before delete", () => {
    const profile = mergeEvidence({ parentHandles: ["one"], evidenceWeight: 2 }, {
      handle: "candidate",
      weight: 3,
      parentHandles: ["two"],
    }, 1000);
    expect(profile.evidenceWeight).toBe(5);
    expect(profile.parentHandles).toEqual(["one", "two"]);
    expect(sourceDueForScoring(profile, 1000 + 86400)).toBe(true);

    const first = nextSourceState(profile, 20, 90);
    const second = nextSourceState({ ...profile, lowScoreStreak: first.lowScoreStreak }, 20, 90);
    const third = nextSourceState({ ...profile, lowScoreStreak: second.lowScoreStreak }, 20, 90);
    expect(first.deleteReady).toBe(false);
    expect(second.deleteReady).toBe(false);
    expect(third.deleteReady).toBe(true);
    expect(nextSourceState({ ...profile, pinned: true, lowScoreStreak: 2 }, 20, 90).deleteReady).toBe(false);
  });

  test("promotes only confident, evidenced candidates", () => {
    expect(nextSourceState({ status: "candidate", evidenceWeight: 3 }, 70, 70)).toMatchObject({ status: "active", enabled: true });
    expect(nextSourceState({ status: "candidate", evidenceWeight: 2 }, 95, 95)).toMatchObject({ status: "candidate", enabled: false });
  });

  test("validates model output, routes reviews and applies hard risk gates", () => {
    const score = parseAiScore({ score: 72, risk: 10, confidence: 90, reason: "Kaynaklı ve güncel." }, "gpt-5.6-luna");
    expect(needsTerraReview(score)).toBe(true);
    expect(hybridOpportunityScore(80, score)).toBe(76);
    expect(hybridOpportunityScore(100, { ...score, risk: 70 })).toBe(0);
    expect(() => parseAiScore({ score: "x", risk: 0, confidence: 0, reason: "bozuk" }, "test")).toThrow();
  });

  test("keeps app secrets out of the Codex environment", () => {
    expect(codexEnvironment({
      HOME: "/tmp/user",
      PATH: "/usr/bin",
      HTTPS_PROXY: "http://proxy.example",
      ISPATLA_SECRET_KEY: "vault-secret",
      ISPATLA_ADMIN_TOKEN: "admin-secret",
      OPENAI_API_KEY: "api-secret",
    })).toEqual({ HOME: "/tmp/user", PATH: "/usr/bin", HTTPS_PROXY: "http://proxy.example" });
  });

  test("blocks scoring when AI is disabled or the monthly budget is exhausted", async () => {
    const enabled = isAiEnabled();
    const budget = getSetting("ai_monthly_budget_usd", "0");
    const previousFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response(); }) as unknown as typeof fetch;
    try {
      setAiEnabled(false);
      await expect(requestAiScore({ task: "post", evidence: "kanıt", provider: "api", model: "gpt-5.6-luna" })).rejects.toThrow("AI kullanımı kapalı");
      setAiEnabled(true);
      setSetting("ai_monthly_budget_usd", "0.000001", Math.floor(Date.now() / 1000));
      await expect(requestAiScore({ task: "post", evidence: "kanıt", provider: "api", model: "gpt-5.6-luna" })).rejects.toThrow("bütçe limiti");
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = previousFetch;
      setAiEnabled(enabled);
      setSetting("ai_monthly_budget_usd", budget, Math.floor(Date.now() / 1000));
    }
  });

  test("validates per-source niche and political taxonomy", () => {
    const score = parseAiScore({
      score: 80,
      risk: 15,
      confidence: 88,
      reason: "Kaynak kalitesi iyi.",
      niche: "ekonomi ve finans",
      topics: ["borsa", "enflasyon"],
      tone: "analitik",
      ideology: "merkez",
      ideologyTags: ["haber-merkezli"],
      ideologyConfidence: 35,
      ideologyBasis: "editorial",
      ideologyReason: "Açık parti aidiyeti kanıtı yok.",
    }, "gpt-5.6-luna", "api", "source");
    expect(score.sourceContext).toEqual({ niche: "ekonomi ve finans", topics: ["borsa", "enflasyon"], tone: "analitik" });
    expect(score.political).toMatchObject({ ideology: "merkez", tags: ["haber-merkezli"], basis: "editorial" });
    expect(() => parseAiScore({ score: 80, risk: 15, confidence: 88, reason: "eksik" }, "gpt-5.6-luna", "api", "source")).toThrow();
  });

  test("requests Luna medium structured output without storing the response", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    const previousFetch = globalThis.fetch;
    let requestBody: Record<string, unknown> = {};
    process.env.OPENAI_API_KEY = "test-only-key";
    globalThis.fetch = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ output_text: JSON.stringify({ score: 80, risk: 10, confidence: 90, reason: "test" }) }));
    }) as typeof fetch;
    try {
      const result = await requestAiScore({ task: "post", evidence: "kanıt", provider: "api", model: "gpt-5.6-luna" });
      expect(result.model).toBe("gpt-5.6-luna");
      expect(requestBody.store).toBe(false);
      expect(requestBody.reasoning).toEqual({ effort: "medium" });
      expect(requestBody.text).toMatchObject({ format: { type: "json_schema", strict: true } });
    } finally {
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousKey;
    }
  });

  test("uses an arbitrary model through a configured OpenAI-compatible endpoint", async () => {
    const previousKey = process.env.AI_COMPATIBLE_API_KEY;
    const previousFetch = globalThis.fetch;
    const previous = getCompatibleSettings();
    let url = "";
    let body: Record<string, unknown> = {};
    process.env.AI_COMPATIBLE_API_KEY = "test-only-key";
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input);
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ score: 80, risk: 10, confidence: 90, reason: "test" }) } }] }));
    }) as unknown as typeof fetch;
    try {
      setCompatibleSettings("https://gateway.example/v1", "Test gateway");
      const result = await requestAiScore({ task: "post", evidence: "kanıt", provider: "compatible", model: "any-vendor/model-v1" });
      expect(result.provider).toBe("compatible");
      expect(url).toBe("https://gateway.example/v1/chat/completions");
      expect(body.model).toBe("any-vendor/model-v1");
      expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    } finally {
      globalThis.fetch = previousFetch;
      const now = Math.floor(Date.now() / 1000);
      setSetting("ai_compatible_base_url", previous.baseUrl, now);
      setSetting("ai_compatible_name", previous.name, now);
      if (previousKey === undefined) delete process.env.AI_COMPATIBLE_API_KEY;
      else process.env.AI_COMPATIBLE_API_KEY = previousKey;
    }
  });

  test("accepts provider model identifiers beyond the suggestion list", () => {
    const current = getAiSettings();
    try {
      const settings = setAiSettings("api", "future-openai-model");
      expect(settings).toEqual({ provider: "api", model: "future-openai-model" });
      expect(reviewModel("api", settings.model)).toBe(settings.model);
    } finally {
      setAiSettings(current.provider, current.model);
    }
  });

  test("keeps discovery reads available while automation publishing is paused", () => {
    const current = getSetting("automation_paused", "0");
    try {
      setSetting("automation_paused", "1", Math.floor(Date.now() / 1000));
      expect(automationEnabled()).toBe(false);
    } finally {
      setSetting("automation_paused", current, Math.floor(Date.now() / 1000));
    }
  });
});
