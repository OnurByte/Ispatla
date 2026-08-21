import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type SourceConfig = {
  handle: string;
  name: string;
  enabled: boolean;
  maxPosts: number;
  rightsStatus: "cleared" | "unknown" | "prohibited";
  profile: Record<string, unknown>;
  feedUrl: string;
};

export type ObservedPost = {
  externalId: string;
  sourceHandle: string;
  authorHandle: string;
  statusUrl: string;
  text: string;
  createdTimestamp: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number;
  mediaCount: number;
  mediaJson: string;
  rawJson: string;
  score: number;
  scoreReason: string;
  sensitive: boolean;
  clusterKey: string;
};

export type RecentPost = ObservedPost & {
  observedAt: number;
  draftText: string;
  draftStatus: string;
  publishStatus: string;
};

export type ActivityPoint = {
  label: string;
  observed: number;
  opportunities: number;
};

export type DashboardSummary = {
  generatedAt: number;
  dbAvailable: boolean;
  dbError?: string;
  sourcesConfigured: number;
  sourcesObserved: number;
  postsObserved: number;
  postsLast24h: number;
  opportunities: number;
  attemptsPending: number;
  publishedConfirmed: number;
  publishBlocked: number;
  automationEnabled: boolean;
  openaiConfigured: boolean;
  xuseAvailable: boolean;
  xuseBin: string;
  recentPosts: RecentPost[];
  activity: ActivityPoint[];
  lastRun: {
    status: string;
    finishedAt: number;
    sourceCount: number;
    postsSeen: number;
    postsNew: number;
    errors: string;
  } | null;
};

const SQLITE_BIN = process.env.SQLITE_BIN || "sqlite3";
const DATABASE_PATH =
  process.env.ISPATLA_DB || join(/* turbopackIgnore: true */ process.cwd(), "state", "ispatla.sqlite3");

let initialized = false;
let initializationError: string | undefined;

const schema = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  max_posts INTEGER NOT NULL DEFAULT 20,
  rights_status TEXT NOT NULL DEFAULT 'unknown',
  profile_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS observed_posts (
  id INTEGER PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  source_handle TEXT NOT NULL,
  author_handle TEXT NOT NULL DEFAULT '',
  status_url TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  created_timestamp INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  reposts INTEGER NOT NULL DEFAULT 0,
  quotes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  media_json TEXT NOT NULL DEFAULT '[]',
  raw_json TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0,
  score_reason TEXT NOT NULL DEFAULT '',
  sensitive INTEGER NOT NULL DEFAULT 0,
  cluster_key TEXT NOT NULL DEFAULT '',
  draft_status TEXT NOT NULL DEFAULT 'not_started',
  draft_text TEXT NOT NULL DEFAULT '',
  publish_status TEXT NOT NULL DEFAULT 'not_started',
  observed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS observed_posts_score_idx
  ON observed_posts(score DESC, observed_at DESC);
CREATE INDEX IF NOT EXISTS observed_posts_cluster_idx
  ON observed_posts(cluster_key, publish_status);
CREATE TABLE IF NOT EXISTS scan_runs (
  id INTEGER PRIMARY KEY,
  started_at INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 0,
  posts_seen INTEGER NOT NULL DEFAULT 0,
  posts_new INTEGER NOT NULL DEFAULT 0,
  errors TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ok'
);
CREATE TABLE IF NOT EXISTS publish_attempts (
  id INTEGER PRIMARY KEY,
  post_external_id TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  receipt TEXT NOT NULL DEFAULT '',
  remote_url TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS publish_attempts_status_idx
  ON publish_attempts(status, created_at DESC);
CREATE TABLE IF NOT EXISTS feedback_snapshots (
  id INTEGER PRIMARY KEY,
  post_external_id TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  replies INTEGER NOT NULL DEFAULT 0,
  reposts INTEGER NOT NULL DEFAULT 0,
  quotes INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  captured_at INTEGER NOT NULL
);
`;

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNumber(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

function sqlBool(value: boolean): string {
  return value ? "1" : "0";
}

function command(sql: string, json = false): unknown[] {
  const args = json ? ["-json", DATABASE_PATH, sql] : [DATABASE_PATH, sql];
  const output = execFileSync(SQLITE_BIN, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
  if (!json || output.length === 0) return [];
  return JSON.parse(output) as unknown[];
}

export function ensureDatabase(): boolean {
  if (initialized) return true;
  if (initializationError) return false;

  try {
    mkdirSync(dirname(/* turbopackIgnore: true */ DATABASE_PATH), { recursive: true });
    command(schema);
    initialized = true;
    return true;
  } catch (error) {
    initializationError = error instanceof Error ? error.message : String(error);
    return false;
  }
}

function rows<T>(sql: string): T[] {
  if (!ensureDatabase()) return [];
  try {
    return command(sql, true) as T[];
  } catch {
    return [];
  }
}

function exec(sql: string): void {
  if (!ensureDatabase()) throw new Error(initializationError || "database unavailable");
  command(sql);
}

export function upsertSource(source: SourceConfig, now: number): void {
  exec(`
    INSERT INTO sources (handle, name, enabled, max_posts, rights_status, profile_json, updated_at)
    VALUES (${sqlString(source.handle)}, ${sqlString(source.name)}, ${sqlBool(source.enabled)},
      ${sqlNumber(source.maxPosts)}, ${sqlString(source.rightsStatus)},
      ${sqlString(JSON.stringify(source.profile))}, ${sqlNumber(now)})
    ON CONFLICT(handle) DO UPDATE SET
      name=excluded.name,
      enabled=excluded.enabled,
      max_posts=excluded.max_posts,
      rights_status=excluded.rights_status,
      profile_json=excluded.profile_json,
      updated_at=excluded.updated_at;
  `);
}

export function getSourceRights(handle: string): SourceConfig["rightsStatus"] {
  const result = rows<{ rights_status: string }>(
    `SELECT rights_status FROM sources WHERE handle=${sqlString(handle)} LIMIT 1;`,
  )[0]?.rights_status;
  return result === "cleared" || result === "prohibited" ? result : "unknown";
}

export function upsertPost(post: ObservedPost, now: number): boolean {
  const existing = rows<{ external_id: string }>(
    `SELECT external_id FROM observed_posts WHERE external_id=${sqlString(post.externalId)} LIMIT 1;`,
  ).length > 0;

  exec(`
    INSERT INTO observed_posts (
      external_id, source_handle, author_handle, status_url, text, created_timestamp,
      likes, replies, reposts, quotes, views, media_count, media_json, raw_json,
      score, score_reason, sensitive, cluster_key, observed_at
    ) VALUES (
      ${sqlString(post.externalId)}, ${sqlString(post.sourceHandle)}, ${sqlString(post.authorHandle)},
      ${sqlString(post.statusUrl)}, ${sqlString(post.text)}, ${sqlNumber(post.createdTimestamp)},
      ${sqlNumber(post.likes)}, ${sqlNumber(post.replies)}, ${sqlNumber(post.reposts)},
      ${sqlNumber(post.quotes)}, ${sqlNumber(post.views)}, ${sqlNumber(post.mediaCount)},
      ${sqlString(post.mediaJson)}, ${sqlString(post.rawJson)}, ${post.score},
      ${sqlString(post.scoreReason)}, ${sqlBool(post.sensitive)}, ${sqlString(post.clusterKey)},
      ${sqlNumber(now)}
    )
    ON CONFLICT(external_id) DO UPDATE SET
      author_handle=excluded.author_handle,
      status_url=excluded.status_url,
      text=excluded.text,
      created_timestamp=excluded.created_timestamp,
      likes=excluded.likes,
      replies=excluded.replies,
      reposts=excluded.reposts,
      quotes=excluded.quotes,
      views=excluded.views,
      media_count=excluded.media_count,
      media_json=excluded.media_json,
      raw_json=excluded.raw_json,
      score=excluded.score,
      score_reason=excluded.score_reason,
      sensitive=excluded.sensitive,
      cluster_key=excluded.cluster_key,
      observed_at=excluded.observed_at;
  `);
  return !existing;
}

export function recordRun(run: {
  startedAt: number;
  finishedAt: number;
  sourceCount: number;
  postsSeen: number;
  postsNew: number;
  errors: string;
  status: string;
}): void {
  exec(`INSERT INTO scan_runs
    (started_at, finished_at, source_count, posts_seen, posts_new, errors, status)
    VALUES (${sqlNumber(run.startedAt)}, ${sqlNumber(run.finishedAt)},
      ${sqlNumber(run.sourceCount)}, ${sqlNumber(run.postsSeen)}, ${sqlNumber(run.postsNew)},
      ${sqlString(run.errors)}, ${sqlString(run.status)});`);
}

export function candidates(limit = 12): RecentPost[] {
  return rows<RecentPost>(`SELECT
    external_id as externalId, source_handle as sourceHandle, author_handle as authorHandle,
    status_url as statusUrl, text, created_timestamp as createdTimestamp, likes, replies,
    reposts, quotes, views, media_count as mediaCount, media_json as mediaJson,
    raw_json as rawJson, score, score_reason as scoreReason, sensitive, cluster_key as clusterKey,
    observed_at as observedAt, draft_text as draftText, draft_status as draftStatus, publish_status as publishStatus
    FROM observed_posts
    WHERE score >= 70 AND sensitive=0 AND publish_status IN ('not_started','blocked')
    ORDER BY score DESC, created_timestamp DESC LIMIT ${sqlNumber(limit)};`);
}

export function hasPublishedCluster(clusterKey: string): boolean {
  return rows<{ count: number }>(`SELECT COUNT(*) as count FROM observed_posts
    WHERE cluster_key=${sqlString(clusterKey)} AND publish_status IN ('pending_reconciliation','confirmed');`)[0]?.count > 0;
}

export function recentPublishCount(now: number): number {
  return rows<{ count: number }>(`SELECT COUNT(*) as count FROM publish_attempts
    WHERE created_at >= ${sqlNumber(now - 86400)}
      AND status IN ('pending_reconciliation','confirmed');`)[0]?.count || 0;
}

export function markDraft(externalId: string, text: string, status: string): void {
  exec(`UPDATE observed_posts SET draft_text=${sqlString(text)}, draft_status=${sqlString(status)}
    WHERE external_id=${sqlString(externalId)};`);
}

export function getPost(externalId: string): RecentPost | null {
  return rows<RecentPost>(`SELECT
    external_id as externalId, source_handle as sourceHandle, author_handle as authorHandle,
    status_url as statusUrl, text, created_timestamp as createdTimestamp, likes, replies,
    reposts, quotes, views, media_count as mediaCount, media_json as mediaJson,
    raw_json as rawJson, score, score_reason as scoreReason, sensitive, cluster_key as clusterKey,
    observed_at as observedAt, draft_text as draftText, draft_status as draftStatus, publish_status as publishStatus
    FROM observed_posts WHERE external_id=${sqlString(externalId)} LIMIT 1;`)[0] || null;
}

export function recordPublishAttempt(input: {
  externalId: string;
  status: string;
  reason: string;
  receipt: string;
  remoteUrl?: string;
  now: number;
}): void {
  exec(`INSERT INTO publish_attempts
    (post_external_id, status, reason, receipt, remote_url, created_at)
    VALUES (${sqlString(input.externalId)}, ${sqlString(input.status)},
      ${sqlString(input.reason)}, ${sqlString(input.receipt)},
      ${sqlString(input.remoteUrl || "")}, ${sqlNumber(input.now)});`);
  exec(`UPDATE observed_posts SET publish_status=${sqlString(input.status)}
    WHERE external_id=${sqlString(input.externalId)};`);
}

export function pendingAttempts(): Array<{
  id: number;
  post_external_id: string;
  receipt: string;
  remote_url: string;
}> {
  return rows<{ id: number; post_external_id: string; receipt: string; remote_url: string }>(`SELECT id, post_external_id, receipt, remote_url FROM publish_attempts
    WHERE status='pending_reconciliation' ORDER BY created_at ASC LIMIT 20;`);
}

export function confirmPublish(attemptId: number, externalId: string): void {
  exec(`UPDATE publish_attempts SET status='confirmed', reason='FxTwitter reconciliation confirmed'
    WHERE id=${sqlNumber(attemptId)};`);
  exec(`UPDATE observed_posts SET publish_status='confirmed'
    WHERE external_id=${sqlString(externalId)};`);
}

export function getRecentPosts(limit = 15): RecentPost[] {
  return rows<RecentPost>(`SELECT
    external_id as externalId, source_handle as sourceHandle, author_handle as authorHandle,
    status_url as statusUrl, text, created_timestamp as createdTimestamp, likes, replies,
    reposts, quotes, views, media_count as mediaCount, media_json as mediaJson,
    raw_json as rawJson, score, score_reason as scoreReason, sensitive, cluster_key as clusterKey,
    observed_at as observedAt, draft_text as draftText, draft_status as draftStatus, publish_status as publishStatus
    FROM observed_posts ORDER BY observed_at DESC LIMIT ${sqlNumber(limit)};`);
}

export function getSummary(sourceCount: number): Omit<DashboardSummary, "generatedAt" | "automationEnabled" | "openaiConfigured" | "xuseAvailable" | "xuseBin"> {
  const now = Math.floor(Date.now() / 1000);
  if (!ensureDatabase()) {
    return {
      dbAvailable: false,
      dbError: initializationError,
      sourcesConfigured: sourceCount,
      sourcesObserved: 0,
      postsObserved: 0,
      postsLast24h: 0,
      opportunities: 0,
      attemptsPending: 0,
      publishedConfirmed: 0,
      publishBlocked: 0,
      recentPosts: [],
      activity: [],
      lastRun: null,
    };
  }
  const scalar = rows<{
    sourcesObserved: number;
    postsObserved: number;
    postsLast24h: number;
    opportunities: number;
    attemptsPending: number;
    publishedConfirmed: number;
    publishBlocked: number;
  }>(`SELECT
    (SELECT COUNT(*) FROM sources WHERE enabled=1) as sourcesObserved,
    (SELECT COUNT(*) FROM observed_posts) as postsObserved,
    (SELECT COUNT(*) FROM observed_posts WHERE observed_at >= ${sqlNumber(now - 86400)}) as postsLast24h,
    (SELECT COUNT(*) FROM observed_posts WHERE score >= 70 AND sensitive=0 AND publish_status IN ('not_started','blocked')) as opportunities,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='pending_reconciliation') as attemptsPending,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='confirmed') as publishedConfirmed,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='blocked') as publishBlocked;`)[0];
  const activity = rows<{ label: string; observed: number; opportunities: number }>(`SELECT
    strftime('%H:00', observed_at, 'unixepoch', 'localtime') as label,
    COUNT(*) as observed,
    SUM(CASE WHEN score >= 70 AND sensitive=0 THEN 1 ELSE 0 END) as opportunities
    FROM observed_posts WHERE observed_at >= ${sqlNumber(now - 86400)}
    GROUP BY strftime('%H:00', observed_at, 'unixepoch', 'localtime')
    ORDER BY label;`);
  const lastRun = rows<DashboardSummary["lastRun"]>(`SELECT status,
    finished_at as finishedAt, source_count as sourceCount, posts_seen as postsSeen,
    posts_new as postsNew, errors FROM scan_runs ORDER BY id DESC LIMIT 1;`)[0] || null;

  return {
    dbAvailable: true,
    sourcesConfigured: sourceCount,
    sourcesObserved: scalar?.sourcesObserved || 0,
    postsObserved: scalar?.postsObserved || 0,
    postsLast24h: scalar?.postsLast24h || 0,
    opportunities: scalar?.opportunities || 0,
    attemptsPending: scalar?.attemptsPending || 0,
    publishedConfirmed: scalar?.publishedConfirmed || 0,
    publishBlocked: scalar?.publishBlocked || 0,
    recentPosts: getRecentPosts(),
    activity,
    lastRun,
  };
}

export function getDatabaseError(): string | undefined {
  return initializationError;
}
