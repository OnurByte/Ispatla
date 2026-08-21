import type { ObservedPost } from "./db";

function nonNegative(value: unknown): number {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
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

export function scorePost(input: Pick<ObservedPost, "likes" | "replies" | "reposts" | "quotes" | "views" | "createdTimestamp" | "mediaCount" | "sensitive">): {
  score: number;
  reason: string;
} {
  const likes = nonNegative(input.likes);
  const replies = nonNegative(input.replies);
  const reposts = nonNegative(input.reposts);
  const quotes = nonNegative(input.quotes);
  const views = nonNegative(input.views);
  const mediaCount = nonNegative(input.mediaCount);
  const ageMinutes = Math.max(
    15,
    (Math.floor(Date.now() / 1000) - nonNegative(input.createdTimestamp)) / 60,
  );
  const weighted = likes * 0.5 + replies * 5 + reposts + quotes * 5;
  const velocity = weighted / (ageMinutes / 60);
  const score = Math.min(
    100,
    Math.max(
      0,
      Math.log(velocity + 1) * 14 +
        Math.min(16, Math.log(views + 1)) +
        (mediaCount > 0 ? 5 : 0) -
        (input.sensitive ? 100 : 0),
    ),
  );

  return {
    score: Math.round(score),
    reason: `velocity=${Math.round(velocity)};views=${Math.round(views)};media=${mediaCount};sensitive=${input.sensitive}`,
  };
}
