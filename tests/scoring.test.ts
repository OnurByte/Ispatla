import { describe, expect, test } from "bun:test";
import { clusterKey, historicalPerformanceScore, isCurrentOpportunity, isNumericalHit, observedEngagement, OPPORTUNITY_MAX_AGE_SECONDS, scorePost, selectDiverseCandidates } from "@/server/scoring";

describe("market scoring", () => {
  test("normalizes Turkish clusters and removes URLs", () => {
    expect(clusterKey("İstanbul'da yeni gelişme: https://example.com/haber"))
      .toBe("istanbul-yeni-gelişme");
  });

  test("gives high-engagement media a publishable score", () => {
    const result = scorePost({
      likes: 12_000,
      replies: 1_500,
      reposts: 4_000,
      quotes: 300,
      views: 2_000_000,
      createdTimestamp: Math.floor(Date.now() / 1000) - 30 * 60,
      mediaCount: 1,
      sensitive: false,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test("rewards engagement relative to the source audience", () => {
    const shared = {
      likes: 100,
      replies: 20,
      reposts: 30,
      quotes: 10,
      views: 10_000,
      createdTimestamp: Math.floor(Date.now() / 1000) - 30 * 60,
      mediaCount: 0,
      sensitive: false,
    };
    expect(scorePost({ ...shared, followers: 1_000 }).score).toBeGreaterThan(scorePost({ ...shared, followers: 1_000_000 }).score);
  });

  test("marks sensitive content in the score reason", () => {
    const result = scorePost({
      likes: 0,
      replies: 0,
      reposts: 0,
      quotes: 0,
      views: 0,
      createdTimestamp: Math.floor(Date.now() / 1000) - 15 * 60,
      mediaCount: 0,
      sensitive: true,
    });

    expect(result.score).toBe(0);
    expect(result.reason).toContain("sensitive=true");
  });

  test("keeps automatic candidates diverse by source and event cluster", () => {
    const selected = selectDiverseCandidates([
      { sourceHandle: "one", clusterKey: "same", id: 1 },
      { sourceHandle: "one", clusterKey: "other", id: 2 },
      { sourceHandle: "two", clusterKey: "same", id: 3 },
      { sourceHandle: "three", clusterKey: "third", id: 4 },
    ], 3);
    expect(selected.map((item) => item.id)).toEqual([1, 4]);
  });

  test("uses confirmed feedback only when it exists", () => {
    expect(historicalPerformanceScore([])).toBeNull();
    expect(historicalPerformanceScore([{ likes: 2_000, replies: 120, reposts: 400, quotes: 80, views: 100_000 }])).toBeGreaterThan(50);
  });

  test("keeps opportunities current and marks only fresh, low-risk numerical hits", () => {
    const now = 2_000_000;
    expect(isCurrentOpportunity(now - OPPORTUNITY_MAX_AGE_SECONDS, now)).toBe(true);
    expect(isCurrentOpportunity(now - OPPORTUNITY_MAX_AGE_SECONDS - 1, now)).toBe(false);
    expect(isNumericalHit(90, now - 2 * 60 * 60, 20, now)).toBe(true);
    expect(isNumericalHit(90, now - 2 * 60 * 60 - 1, 20, now)).toBe(false);
    expect(isNumericalHit(90, now - 60, 35, now)).toBe(false);
    expect(observedEngagement({ likes: 10, replies: 2, reposts: 3, quotes: 1, createdTimestamp: now - 3600, followers: 1_000, now })).toEqual({ weighted: 23, velocity: 23, rate: 0.023 });
  });
});
