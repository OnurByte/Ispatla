import { describe, expect, test } from "bun:test";
import { accountCategories, feedbackFromTweet, formatSourceAttribution, mediaCandidate, normalisePost, qualityGate, selectPublishingAccount } from "@/server/pipeline";
import type { Account, ObservedPost, SourceConfig } from "@/server/db";

function post(overrides: Partial<ObservedPost> = {}): ObservedPost {
  return {
    externalId: "123",
    sourceHandle: "bpthaber",
    authorHandle: "bpthaber",
    statusUrl: "https://x.com/bpthaber/status/123",
    text: "Kaynak haber metni burada.",
    createdTimestamp: Math.floor(Date.now() / 1000) - 900,
    likes: 100,
    replies: 10,
    reposts: 20,
    quotes: 1,
    views: 10_000,
    mediaCount: 0,
    mediaJson: "[]",
    rawJson: "{}",
    score: 80,
    scoreReason: "test",
    sensitive: false,
    clusterKey: "kaynak-haber-metni",
    ...overrides,
  };
}

function account(id: number, defaultAccount = false): Account {
  return { id, accountKey: String(id), handle: `account${id}`, displayName: "", xuseAccountId: "", enabled: true, defaultAccount, automationMode: "auto", dailyLimit: 24, capabilities: [], styleProfile: {}, updatedAt: 0 };
}

describe("pipeline trust boundaries", () => {
  test("rejects non-numeric external ids and sanitizes external status URLs", () => {
    expect(normalisePost("bpthaber", { id: "not-an-x-id", text: "haber" })).toBeNull();
    const normalized = normalisePost("bpthaber", {
      id: "123",
      text: "haber metni",
      url: "javascript:alert(1)",
      author: { screen_name: "bpthaber" },
    });
    expect(normalized?.statusUrl).toBe("https://x.com/bpthaber/status/123");
  });

  test("never selects media outside the exact Twitter media allowlist", () => {
    const media = mediaCandidate(
      post({
        mediaCount: 2,
        mediaJson: JSON.stringify([
          { type: "photo", url: "https://pbs.twimg.com.evil.example/a.jpg" },
          { type: "photo", url: "https://pbs.twimg.com/media/a.jpg?format=jpg" },
        ]),
      }),
    );
    expect(media).toEqual({ kind: "photo", url: "https://pbs.twimg.com/media/a.jpg?format=jpg" });
  });

  test("blocks copied, oversized and sensitive drafts before publish", () => {
    expect(qualityGate(post(), "Kaynak haber metni burada.")).toBe("draft copies source text");
    expect(qualityGate(post(), "çok kısa")).toBe("draft is too short");
    expect(qualityGate(post({ sensitive: true }), "Bu özgün ve yeterince uzun bir taslaktır.")).toBe(
      "sensitive source is not autopilot eligible",
    );
    expect(qualityGate(post(), "a".repeat(281))).toBe("draft exceeds X character limit");
  });

  test("normalizes a confirmed post feedback snapshot", () => {
    expect(feedbackFromTweet({ likes: "12", replies: 3, retweets: 4, quotes: 5, views: "600" }, "123", 456)).toEqual({
      externalId: "123", likes: 12, replies: 3, reposts: 4, quotes: 5, views: 600, now: 456,
    });
  });

  test("uses the default account until feedback identifies a better account", () => {
    const accounts = [account(1, true), account(2)];
    expect(selectPublishingAccount(accounts, () => null)?.id).toBe(1);
    expect(selectPublishingAccount(accounts, (id) => id === 2 ? 80 : 30)?.id).toBe(2);
  });

  test("does not cross an explicitly configured source/account editorial axis", () => {
    const source = { profile: { ideology: "seküler", ideologyTags: [] } } as unknown as SourceConfig;
    expect(selectPublishingAccount([account(1)], () => null, source)).toBeUndefined();
    expect(selectPublishingAccount([{ ...account(1), styleProfile: { ideology: "seküler" } }], () => null, source)?.id).toBe(1);
    const taggedSource = { profile: { ideology: "belirsiz", ideologyTags: ["islamcı"] } } as unknown as SourceConfig;
    expect(selectPublishingAccount([account(1)], () => null, taggedSource)).toBeUndefined();
  });

  test("routes automatic publishing only to configured matching categories", () => {
    const technology = { ...account(1), automationMode: "auto" as const, styleProfile: { categories: ["teknoloji", "haber"] } };
    const magazine = { ...account(2), automationMode: "auto" as const, styleProfile: { categories: ["magazin"] } };
    expect(accountCategories(technology)).toEqual(["teknoloji", "haber"]);
    expect(selectPublishingAccount([technology, magazine], () => null, undefined, ["magazin"], true)?.id).toBe(2);
    expect(selectPublishingAccount([technology], () => null, undefined, ["magazin"], true)).toBeUndefined();
  });

  test("formats source attribution without tagging the source account", () => {
    const source = { handle: "brickcenter", name: "Brickcenter" } as SourceConfig;
    expect(formatSourceAttribution("Başlık ve gelişme Kaynak: @brickcenter", source, "brickcenter")).toBe("Başlık ve gelişme (Brickcenter)");
    expect(formatSourceAttribution("Başlık", undefined, "brickcenter")).toBe("Başlık");
  });
});
