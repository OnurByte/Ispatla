import { describe, expect, test } from "bun:test";
import { needsTerraReview, parseAiScore, requestAiScore } from "@/server/ai";
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
});
