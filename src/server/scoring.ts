import type { ObservedPost } from "./db";
import type { AiScore } from "./ai";

export const OPPORTUNITY_MAX_AGE_SECONDS = 24 * 60 * 60;

function nonNegative(value: unknown): number {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function observedEngagement(input: Pick<ObservedPost, "likes" | "replies" | "reposts" | "quotes" | "createdTimestamp"> & { followers?: number; now?: number }): {
  weighted: number;
  velocity: number;
  rate: number;
} {
  const weighted = nonNegative(input.likes) * 0.5 + nonNegative(input.replies) * 5 + nonNegative(input.reposts) + nonNegative(input.quotes) * 5;
  const ageHours = Math.max(0.25, ((input.now || Math.floor(Date.now() / 1000)) - nonNegative(input.createdTimestamp)) / 3600);
  return { weighted, velocity: weighted / ageHours, rate: nonNegative(input.followers) > 0 ? weighted / nonNegative(input.followers) : 0 };
}

export function isNumericalHit(momentum: number, createdTimestamp: number, risk = 0, now = Math.floor(Date.now() / 1000)): boolean {
  return momentum >= 90 && risk < 35 && createdTimestamp > 0 && now - createdTimestamp <= 2 * 60 * 60;
}

export function clusterKey(text: string): string {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 8)
    .join("-");
}

export function scorePost(input: Pick<ObservedPost, "likes" | "replies" | "reposts" | "quotes" | "views" | "createdTimestamp" | "mediaCount" | "sensitive"> & { followers?: number }): {
  score: number;
  reason: string;
} {
  const views = nonNegative(input.views);
  const mediaCount = nonNegative(input.mediaCount);
  const followers = nonNegative(input.followers);
  const engagement = observedEngagement(input);
  const velocity = engagement.velocity;
  const engagementRate = engagement.rate;
  const score = Math.min(
    100,
    Math.max(
      0,
      Math.log(velocity + 1) * 14 +
        Math.min(16, Math.log(views + 1)) +
        Math.min(20, Math.log1p(engagementRate * 1_000) * 5) +
        (mediaCount > 0 ? 5 : 0) -
        (input.sensitive ? 100 : 0),
    ),
  );

  const rounded = Math.round(score);
  return {
    score: rounded,
    reason: `heuristic:${JSON.stringify({
      momentum: rounded,
      ai: 0,
      risk: input.sensitive ? 100 : rounded < 70 ? 45 : 15,
      confidence: 0,
      model: "",
      reason: `velocity=${Math.round(velocity)};views=${Math.round(views)};followers=${Math.round(followers)};engagementRate=${engagementRate.toFixed(4)};media=${mediaCount};sensitive=${input.sensitive}`,
    })}`,
  };
}

export function hybridOpportunityScore(momentum: number, ai: AiScore, sensitive = false): number {
  if (sensitive || ai.risk >= 70) return 0;
  return Math.round(Math.min(100, Math.max(0, momentum * 0.45 + ai.score * 0.55)));
}

export function historicalPerformanceScore(samples: Array<{ likes: number; replies: number; reposts: number; quotes: number; views: number }>): number | null {
  if (!samples.length) return null;
  const average = samples.reduce((total, sample) => {
    const views = Math.max(1, nonNegative(sample.views));
    const actions = nonNegative(sample.likes) + nonNegative(sample.replies) * 3 + nonNegative(sample.reposts) * 2 + nonNegative(sample.quotes) * 3;
    return total + Math.min(100, Math.log1p(actions) * 10 + Math.min(50, (actions / views) * 10_000));
  }, 0) / samples.length;
  return Math.round(average);
}

export function isCurrentOpportunity(createdTimestamp: number, now = Math.floor(Date.now() / 1000)): boolean {
  return createdTimestamp > 0 && createdTimestamp <= now + 300 && now - createdTimestamp <= OPPORTUNITY_MAX_AGE_SECONDS;
}

export function selectDiverseCandidates<T extends { sourceHandle: string; clusterKey: string }>(posts: T[], limit: number): T[] {
  const selected: T[] = [];
  const sources = new Set<string>();
  const clusters = new Set<string>();
  for (const post of posts) {
    if (selected.length >= limit) break;
    if (sources.has(post.sourceHandle) || (post.clusterKey && clusters.has(post.clusterKey))) continue;
    selected.push(post);
    sources.add(post.sourceHandle);
    if (post.clusterKey) clusters.add(post.clusterKey);
  }
  return selected;
}
