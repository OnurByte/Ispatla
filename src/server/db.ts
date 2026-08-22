import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const IDEOLOGY_AXES = [
  "belirsiz",
  "aşırı sol",
  "sol",
  "merkez sol",
  "merkez",
  "merkez sağ",
  "sağ",
  "aşırı sağ",
] as const;
export type IdeologyAxis = (typeof IDEOLOGY_AXES)[number];

export const IDEOLOGY_TAGS = [
  "sosyalist",
  "sosyal demokrat",
  "liberal",
  "liberteryen",
  "muhafazakâr",
  "islamcı",
  "şeriatçı",
  "ümmetçi",
  "kemalist",
  "ulusalcı",
  "türkçü",
  "milliyetçi",
  "kürtçü",
  "kürt milliyetçisi",
  "seküler",
  "lgbt+ hakları destekçisi",
  "lgbt+ karşıtı",
  "resmi-kurumsal",
  "haber-merkezli",
  "doğrulamacı",
] as const;
export type IdeologyTag = (typeof IDEOLOGY_TAGS)[number];

export const IDEOLOGY_BASES = ["declared", "editorial", "observed", "insufficient_evidence"] as const;
export type IdeologyBasis = (typeof IDEOLOGY_BASES)[number];

export type SourceProfile = {
  niche?: string;
  ideology?: IdeologyAxis;
  ideologyTags?: IdeologyTag[];
  ideologyConfidence?: number;
  ideologyBasis?: IdeologyBasis;
  ideologyReason?: string;
  tone?: string;
  topics?: string[];
  certainty?: string;
  origin?: "seed" | "manual" | "discovered";
  status?: "candidate" | "active";
  pinned?: boolean;
  avatarUrl?: string;
  bio?: string;
  followers?: number;
  parentHandles?: string[];
  evidenceWeight?: number;
  lastEvidenceAt?: number;
  sourceScore?: number;
  sourceConfidence?: number;
  sourceRisk?: number;
  scoreReason?: string;
  scoreModel?: string;
  lastSeenAt?: number;
  lastScoredAt?: number;
  lowScoreStreak?: number;
};

export type SourceConfig = {
  handle: string;
  name: string;
  enabled: boolean;
  maxPosts: number;
  rightsStatus: "cleared" | "unknown" | "prohibited";
  profile: SourceProfile;
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
  aiConfigured: boolean;
  aiProvider: "api" | "codex";
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

export type Account = {
  id: number;
  accountKey: string;
  handle: string;
  displayName: string;
  xuseAccountId: string;
  enabled: boolean;
  defaultAccount: boolean;
  automationMode: "manual" | "auto";
  dailyLimit: number;
  capabilities: string[];
  styleProfile: Record<string, unknown>;
  updatedAt: number;
};

export type MarketItem = RecentPost & {
  freshness: number;
  velocity: number;
  relevance: number;
  risk: number;
  marketStatus: "new" | "drafted" | "queued" | "published" | "ignored";
  scoreEvidence: ScoreEvidence;
};

export type ScoreEvidence = {
  kind: "hybrid" | "heuristic";
  momentum: number;
  ai: number;
  risk: number;
  confidence: number;
  model: string;
  reason: string;
};

export type DraftRecord = {
  id: number;
  batchId: string;
  origin: string;
  prompt: string;
  provider: string;
  model: string;
  variantMode: string;
  sourceHandle: string;
  sourceUrl: string;
  externalId: string;
  accountId: number | null;
  accountHandle: string;
  format: string;
  text: string;
  status: string;
  gateReason: string;
  score: number;
  createdAt: number;
  updatedAt: number;
};

export type AutomationJob = {
  id: number;
  draftId: number;
  accountId: number | null;
  accountHandle: string;
  action: string;
  scheduledAt: number;
  status: string;
  receipt: string;
  reason: string;
  xuseQueueId: string;
  remoteUrl: string;
  reconciliationStatus: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

export type DraftBatch = {
  id: string;
  prompt: string;
  format: string;
  variantMode: "per_account" | "same_text";
  accountIds: number[];
  provider: string;
  model: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type UsageEvent = {
  id: number;
  kind: string;
  provider: string;
  model: string;
  units: number;
  estimatedUsd: number;
  metadata: Record<string, unknown>;
  createdAt: number;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type ChatMessage = {
  id: number;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  intent: Record<string, unknown> | null;
  createdAt: number;
};

export type ChatAction = {
  id: number;
  sessionId: string;
  messageId: number;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  reason: string;
  createdAt: number;
  executedAt: number | null;
};

export type SecretMeta = {
  name: string;
  provider: string;
  configured: boolean;
  masked: string;
  updatedAt: number;
};

const SQLITE_BIN = process.env.SQLITE_BIN || "sqlite3";
const DATABASE_PATH =
  process.env.ISPATLA_DB || join(/* turbopackIgnore: true */ process.cwd(), "state", "ispatla.sqlite3");

let initialized = false;
let initializationError: string | undefined;

const schema = `
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
CREATE TABLE IF NOT EXISTS source_events (
  id INTEGER PRIMARY KEY,
  handle TEXT NOT NULL,
  event TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS source_events_handle_idx
  ON source_events(handle, created_at DESC);
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
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  account_key TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  xuse_account_id TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  default_account INTEGER NOT NULL DEFAULT 0,
  automation_mode TEXT NOT NULL DEFAULT 'manual',
  daily_limit INTEGER NOT NULL DEFAULT 6,
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  style_profile_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS secrets (
  name TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT '',
  ciphertext TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS app_settings (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY,
  batch_id TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT 'manual',
  prompt TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  variant_mode TEXT NOT NULL DEFAULT 'same_text',
  source_handle TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_score REAL NOT NULL DEFAULT 0,
  external_id TEXT NOT NULL DEFAULT '',
  account_id INTEGER,
  format TEXT NOT NULL DEFAULT 'post',
  text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  gate_reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS drafts_status_idx ON drafts(status, updated_at DESC);
CREATE TABLE IF NOT EXISTS automation_jobs (
  id INTEGER PRIMARY KEY,
  draft_id INTEGER NOT NULL,
  account_id INTEGER,
  action TEXT NOT NULL DEFAULT 'post',
  scheduled_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  receipt TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  xuse_queue_id TEXT NOT NULL DEFAULT '',
  remote_url TEXT NOT NULL DEFAULT '',
  reconciliation_status TEXT NOT NULL DEFAULT 'not_started',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(draft_id) REFERENCES drafts(id),
  FOREIGN KEY(account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS automation_jobs_status_idx ON automation_jobs(status, scheduled_at ASC);
CREATE TABLE IF NOT EXISTS draft_batches (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'post',
  variant_mode TEXT NOT NULL DEFAULT 'per_account',
  account_ids_json TEXT NOT NULL DEFAULT '[]',
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  units INTEGER NOT NULL DEFAULT 1,
  estimated_usd REAL NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_events_created_idx ON usage_events(created_at DESC);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Yeni konuşma',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  intent_json TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id, created_at ASC);
CREATE TABLE IF NOT EXISTS chat_actions (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  reason TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  executed_at INTEGER,
  FOREIGN KEY(session_id) REFERENCES chat_sessions(id),
  FOREIGN KEY(message_id) REFERENCES chat_messages(id)
);
CREATE INDEX IF NOT EXISTS chat_actions_status_idx ON chat_actions(status, created_at DESC);
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

const OPPORTUNITY_WHERE = "score >= 70 AND sensitive=0 AND publish_status NOT IN ('confirmed','pending_reconciliation')";

function command(sql: string, json = false): unknown[] {
  const args = json
    ? ["-cmd", ".timeout 1000", "-json", DATABASE_PATH, sql]
    : ["-cmd", ".timeout 1000", DATABASE_PATH, sql];
  const output = execFileSync(/*turbopackIgnore: true*/ SQLITE_BIN, args, {
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
    for (const [table, column, definition] of [
      ["drafts", "batch_id", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "origin", "TEXT NOT NULL DEFAULT 'manual'"],
      ["drafts", "prompt", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "provider", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "model", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "variant_mode", "TEXT NOT NULL DEFAULT 'same_text'"],
      ["drafts", "source_handle", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "source_url", "TEXT NOT NULL DEFAULT ''"],
      ["drafts", "source_score", "REAL NOT NULL DEFAULT 0"],
      ["automation_jobs", "xuse_queue_id", "TEXT NOT NULL DEFAULT ''"],
      ["automation_jobs", "remote_url", "TEXT NOT NULL DEFAULT ''"],
      ["automation_jobs", "reconciliation_status", "TEXT NOT NULL DEFAULT 'not_started'"],
    ] as const) {
      const columns = command(`PRAGMA table_info(${table});`, true) as Array<{ name?: string }>;
      if (!columns.some((item) => item.name === column)) {
        command(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      }
    }
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
      score=CASE WHEN observed_posts.score_reason LIKE 'hybrid:%' THEN observed_posts.score ELSE excluded.score END,
      score_reason=CASE WHEN observed_posts.score_reason LIKE 'hybrid:%' THEN observed_posts.score_reason ELSE excluded.score_reason END,
      sensitive=excluded.sensitive,
      cluster_key=excluded.cluster_key,
      observed_at=excluded.observed_at;
  `);
  return !existing;
}

export function updatePostScore(externalId: string, score: number, scoreReason: string): void {
  exec(`UPDATE observed_posts SET score=${sqlNumber(score)}, score_reason=${sqlString(scoreReason)}
    WHERE external_id=${sqlString(externalId)};`);
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
    WHERE score >= 70 AND sensitive=0 AND score_reason LIKE 'hybrid:%'
      AND publish_status IN ('not_started','blocked')
    ORDER BY score DESC, created_timestamp DESC LIMIT ${sqlNumber(limit)};`);
}

export function heuristicPosts(limit = 25): RecentPost[] {
  return rows<RecentPost>(`SELECT
    external_id as externalId, source_handle as sourceHandle, author_handle as authorHandle,
    status_url as statusUrl, text, created_timestamp as createdTimestamp, likes, replies,
    reposts, quotes, views, media_count as mediaCount, media_json as mediaJson,
    raw_json as rawJson, score, score_reason as scoreReason, sensitive, cluster_key as clusterKey,
    observed_at as observedAt, draft_text as draftText, draft_status as draftStatus, publish_status as publishStatus
    FROM observed_posts
    WHERE sensitive=0 AND score_reason LIKE 'heuristic:%'
    ORDER BY created_timestamp DESC LIMIT ${sqlNumber(limit)};`);
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

export function recordFeedbackSnapshot(input: {
  externalId: string;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  views: number;
  now: number;
}): void {
  exec(`INSERT INTO feedback_snapshots
    (post_external_id, likes, replies, reposts, quotes, views, captured_at)
    VALUES (${sqlString(input.externalId)}, ${sqlNumber(input.likes)}, ${sqlNumber(input.replies)},
      ${sqlNumber(input.reposts)}, ${sqlNumber(input.quotes)}, ${sqlNumber(input.views)}, ${sqlNumber(input.now)});`);
}

const POST_COLUMNS = `SELECT
    external_id as externalId, source_handle as sourceHandle, author_handle as authorHandle,
    status_url as statusUrl, text, created_timestamp as createdTimestamp, likes, replies,
    reposts, quotes, views, media_count as mediaCount, media_json as mediaJson,
    raw_json as rawJson, score, score_reason as scoreReason, sensitive, cluster_key as clusterKey,
    observed_at as observedAt, draft_text as draftText, draft_status as draftStatus, publish_status as publishStatus
    FROM observed_posts`;

function selectPosts(where: string, orderBy: string, limit?: number): RecentPost[] {
  const whereSql = where ? ` WHERE ${where}` : "";
  const limitSql = limit === undefined ? "" : ` LIMIT ${sqlNumber(limit)}`;
  return rows<RecentPost>(`${POST_COLUMNS}${whereSql} ORDER BY ${orderBy}${limitSql};`);
}

export function getRecentPosts(limit = 15): RecentPost[] {
  return selectPosts("", "observed_at DESC", limit);
}

export function getSummary(sourceCount: number): Omit<DashboardSummary, "generatedAt" | "automationEnabled" | "openaiConfigured" | "aiConfigured" | "aiProvider" | "xuseAvailable" | "xuseBin"> {
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
    attemptsPending: number;
    publishedConfirmed: number;
    publishBlocked: number;
  }>(`SELECT
    (SELECT COUNT(*) FROM sources WHERE enabled=1) as sourcesObserved,
    (SELECT COUNT(*) FROM observed_posts) as postsObserved,
    (SELECT COUNT(*) FROM observed_posts WHERE observed_at >= ${sqlNumber(now - 86400)}) as postsLast24h,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='pending_reconciliation') as attemptsPending,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='confirmed') as publishedConfirmed,
    (SELECT COUNT(*) FROM publish_attempts WHERE status='blocked') as publishBlocked;`)[0];
  const activity = rows<{ label: string; observed: number; opportunities: number }>(`SELECT
    strftime('%H:00', observed_at, 'unixepoch', 'localtime') as label,
    COUNT(*) as observed,
    SUM(CASE WHEN ${OPPORTUNITY_WHERE} THEN 1 ELSE 0 END) as opportunities
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
    opportunities: getOpportunityItems().length,
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

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function getStoredSources(): SourceConfig[] {
  return rows<{
    handle: string;
    name: string;
    enabled: number;
    max_posts: number;
    rights_status: string;
    profile_json: string;
  }>(`SELECT handle, name, enabled, max_posts, rights_status, profile_json
      FROM sources ORDER BY handle;`).map((source) => ({
    handle: source.handle,
    name: source.name,
    enabled: source.enabled === 1,
    maxPosts: source.max_posts,
    rightsStatus: source.rights_status === "cleared" || source.rights_status === "prohibited" ? source.rights_status : "unknown",
    profile: parseObject(source.profile_json),
    feedUrl: `https://api.fxtwitter.com/2/profile/${encodeURIComponent(source.handle)}/statuses`,
  }));
}

export function deleteSource(handle: string): void {
  exec(`DELETE FROM sources WHERE handle=${sqlString(handle)};`);
}

export function recordSourceEvent(input: {
  handle: string;
  event: string;
  score: number;
  reason: string;
  model: string;
  now: number;
}): void {
  exec(`INSERT INTO source_events (handle, event, score, reason, model, created_at)
    VALUES (${sqlString(input.handle)}, ${sqlString(input.event)}, ${sqlNumber(input.score)},
      ${sqlString(input.reason)}, ${sqlString(input.model)}, ${sqlNumber(input.now)});`);
}

export function sourceWasDeletedSince(handle: string, since: number): boolean {
  return (rows<{ count: number }>(`SELECT COUNT(*) as count FROM source_events
    WHERE handle=${sqlString(handle)} AND event='deleted' AND created_at >= ${sqlNumber(since)};`)[0]?.count || 0) > 0;
}

export function getAccounts(): Account[] {
  return rows<{
    id: number;
    account_key: string;
    handle: string;
    display_name: string;
    xuse_account_id: string;
    enabled: number;
    default_account: number;
    automation_mode: string;
    daily_limit: number;
    capabilities_json: string;
    style_profile_json: string;
    updated_at: number;
  }>(`SELECT id, account_key, handle, display_name, xuse_account_id, enabled,
      default_account, automation_mode, daily_limit, capabilities_json,
      style_profile_json, updated_at FROM accounts ORDER BY default_account DESC, handle;`).map((account) => ({
    id: account.id,
    accountKey: account.account_key,
    handle: account.handle,
    displayName: account.display_name,
    xuseAccountId: account.xuse_account_id,
    enabled: account.enabled === 1,
    defaultAccount: account.default_account === 1,
    automationMode: account.automation_mode === "auto" ? "auto" : "manual",
    dailyLimit: account.daily_limit,
    capabilities: parseArray(account.capabilities_json),
    styleProfile: parseObject(account.style_profile_json),
    updatedAt: account.updated_at,
  }));
}

export function saveAccount(input: {
  id?: number;
  accountKey: string;
  handle: string;
  displayName: string;
  xuseAccountId: string;
  enabled: boolean;
  defaultAccount: boolean;
  automationMode: "manual" | "auto";
  dailyLimit: number;
  capabilities: string[];
  styleProfile?: Record<string, unknown>;
  now: number;
}): Account {
  if (input.defaultAccount) {
    exec("UPDATE accounts SET default_account=0;");
  }
  const id = input.id && Number.isInteger(input.id) ? input.id : 0;
  if (id > 0) {
    exec(`UPDATE accounts SET account_key=${sqlString(input.accountKey)}, handle=${sqlString(input.handle)},
      display_name=${sqlString(input.displayName)}, xuse_account_id=${sqlString(input.xuseAccountId)},
      enabled=${sqlBool(input.enabled)}, default_account=${sqlBool(input.defaultAccount)},
      automation_mode=${sqlString(input.automationMode)}, daily_limit=${sqlNumber(input.dailyLimit)},
      capabilities_json=${sqlString(JSON.stringify(input.capabilities))},
      style_profile_json=${sqlString(JSON.stringify(input.styleProfile || {}))}, updated_at=${sqlNumber(input.now)}
      WHERE id=${sqlNumber(id)};`);
  } else {
    exec(`INSERT INTO accounts (account_key, handle, display_name, xuse_account_id, enabled,
      default_account, automation_mode, daily_limit, capabilities_json, style_profile_json, updated_at)
      VALUES (${sqlString(input.accountKey)}, ${sqlString(input.handle)}, ${sqlString(input.displayName)},
      ${sqlString(input.xuseAccountId)}, ${sqlBool(input.enabled)}, ${sqlBool(input.defaultAccount)},
      ${sqlString(input.automationMode)}, ${sqlNumber(input.dailyLimit)},
      ${sqlString(JSON.stringify(input.capabilities))}, ${sqlString(JSON.stringify(input.styleProfile || {}))},
      ${sqlNumber(input.now)});`);
  }
  const result = id > 0 ? getAccounts().find((account) => account.id === id) : getAccounts().find((account) => account.accountKey === input.accountKey);
  if (!result) throw new Error("account could not be saved");
  return result;
}

export function deleteAccount(id: number): void {
  exec(`DELETE FROM automation_jobs WHERE account_id=${sqlNumber(id)};`);
  exec(`DELETE FROM drafts WHERE account_id=${sqlNumber(id)};`);
  exec(`DELETE FROM accounts WHERE id=${sqlNumber(id)};`);
}

function toMarketItem(post: RecentPost): MarketItem {
    const ageHours = Math.max(0, (Date.now() / 1000 - post.createdTimestamp) / 3600);
    const engagement = post.likes + post.replies * 2 + post.reposts * 2 + post.quotes * 3;
    const marketStatus = post.publishStatus === "confirmed"
      ? "published"
      : post.publishStatus === "pending_reconciliation"
        ? "queued"
        : post.draftStatus !== "not_started"
          ? "drafted"
          : "new";
    const scoreEvidence = parseScoreEvidence(post.scoreReason, post.score);
    return {
      ...post,
      freshness: Math.max(0, Math.round(100 - ageHours * 4)),
      velocity: Math.min(100, Math.round(Math.log10(engagement + 1) * 22)),
      relevance: Math.round(post.score),
      risk: post.sensitive ? 100 : scoreEvidence.risk,
      marketStatus,
      scoreEvidence,
    };
}

export function getMarketItems(limit = 50): MarketItem[] {
  return getRecentPosts(limit).filter((post) => !post.sensitive).map(toMarketItem);
}

export function getOpportunityItems(limit?: number): MarketItem[] {
  return selectPosts(OPPORTUNITY_WHERE, "score DESC, observed_at DESC", limit).map(toMarketItem);
}

function parseScoreEvidence(value: string, score: number): ScoreEvidence {
  const separator = value.indexOf(":");
  const kindValue = separator >= 0 ? value.slice(0, separator) : value;
  const json = separator >= 0 ? value.slice(separator + 1) : "";
  if ((kindValue === "hybrid" || kindValue === "heuristic") && json) {
    try {
      const parsed = JSON.parse(json) as Partial<ScoreEvidence>;
      return {
        kind: kindValue,
        momentum: Number(parsed.momentum || 0),
        ai: Number(parsed.ai || 0),
        risk: Number(parsed.risk || 0),
        confidence: Number(parsed.confidence || 0),
        model: String(parsed.model || ""),
        reason: String(parsed.reason || ""),
      };
    } catch {
      // Legacy score reasons remain visible as heuristic evidence.
    }
  }
  return {
    kind: "heuristic",
    momentum: Math.round(score),
    ai: 0,
    risk: score < 70 ? 45 : 15,
    confidence: 0,
    model: "",
    reason: value,
  };
}

export function getDrafts(limit = 100): DraftRecord[] {
  return rows<{
    id: number;
    batch_id: string;
    origin: string;
    prompt: string;
    provider: string;
    model: string;
    variant_mode: string;
    external_id: string;
    account_id: number | null;
    handle: string | null;
    format: string;
    text: string;
    status: string;
    gate_reason: string;
    source_handle: string | null;
    source_url: string | null;
    source_score: number | null;
    score: number | null;
    created_at: number;
    updated_at: number;
  }>(`SELECT drafts.id, drafts.batch_id, drafts.origin, drafts.prompt, drafts.provider,
      drafts.model, drafts.variant_mode, drafts.external_id, drafts.account_id, accounts.handle,
      drafts.format, drafts.text, drafts.status, drafts.gate_reason,
      COALESCE(NULLIF(drafts.source_handle, ''), observed_posts.source_handle) as source_handle,
      COALESCE(NULLIF(drafts.source_url, ''), observed_posts.status_url) as source_url,
      COALESCE(NULLIF(drafts.source_score, 0), observed_posts.score) as source_score,
      drafts.created_at, drafts.updated_at
      FROM drafts
      LEFT JOIN accounts ON accounts.id=drafts.account_id
      LEFT JOIN observed_posts ON observed_posts.external_id=drafts.external_id
  ORDER BY drafts.updated_at DESC, drafts.id DESC LIMIT ${sqlNumber(limit)};`).map((draft) => ({
    id: draft.id,
    batchId: draft.batch_id || "",
    origin: draft.origin || "manual",
    prompt: draft.prompt || "",
    provider: draft.provider || "",
    model: draft.model || "",
    variantMode: draft.variant_mode || "same_text",
    externalId: draft.external_id,
    accountId: draft.account_id,
    accountHandle: draft.handle || "atanmamış",
    format: draft.format,
    text: draft.text,
    status: draft.status,
    gateReason: draft.gate_reason,
    sourceHandle: draft.source_handle || "",
    sourceUrl: draft.source_url || "",
    score: draft.source_score || 0,
    createdAt: draft.created_at,
    updatedAt: draft.updated_at,
  }));
}

export function getDraft(id: number): DraftRecord | null {
  return getDrafts(200).find((draft) => draft.id === id) || null;
}

export function createDraft(input: {
  batchId?: string;
  origin?: string;
  prompt?: string;
  provider?: string;
  model?: string;
  variantMode?: string;
  externalId: string;
  accountId?: number | null;
  format: string;
  text: string;
  status?: string;
  gateReason?: string;
  sourceHandle?: string;
  sourceUrl?: string;
  sourceScore?: number;
  now: number;
}): DraftRecord {
  exec(`INSERT INTO drafts (batch_id, origin, prompt, provider, model, variant_mode, source_handle, source_url, source_score,
      external_id, account_id, format, text, status, gate_reason, created_at, updated_at)
    VALUES (${sqlString(input.batchId || "")}, ${sqlString(input.origin || "manual")},
      ${sqlString(input.prompt || "")}, ${sqlString(input.provider || "")}, ${sqlString(input.model || "")},
      ${sqlString(input.variantMode || "same_text")}, ${sqlString(input.sourceHandle || "")},
      ${sqlString(input.sourceUrl || "")}, ${Number.isFinite(input.sourceScore) ? input.sourceScore : 0},
      ${sqlString(input.externalId)}, ${input.accountId ? sqlNumber(input.accountId) : "NULL"},
      ${sqlString(input.format)}, ${sqlString(input.text)}, ${sqlString(input.status || "draft")},
      ${sqlString(input.gateReason || "")}, ${sqlNumber(input.now)}, ${sqlNumber(input.now)});`);
  const result = getDrafts(100).sort((left, right) => right.id - left.id)[0];
  if (!result) throw new Error("draft could not be created");
  return result;
}

export function updateDraft(input: {
  id: number;
  accountId?: number | null;
  format?: string;
  text?: string;
  status?: string;
  gateReason?: string;
  sourceHandle?: string;
  sourceUrl?: string;
  now: number;
}): DraftRecord | null {
  const current = getDraft(input.id);
  if (!current) return null;
  const accountSql = input.accountId === undefined ? "account_id" : input.accountId === null ? "NULL" : sqlNumber(input.accountId);
  exec(`UPDATE drafts SET account_id=${accountSql}, format=${sqlString(input.format ?? current.format)},
    text=${sqlString(input.text ?? current.text)}, status=${sqlString(input.status ?? current.status)},
    gate_reason=${sqlString(input.gateReason ?? current.gateReason)},
    source_handle=${sqlString(input.sourceHandle ?? current.sourceHandle)},
    source_url=${sqlString(input.sourceUrl ?? current.sourceUrl)}, updated_at=${sqlNumber(input.now)}
    WHERE id=${sqlNumber(input.id)};`);
  return getDraft(input.id);
}

export function getJobs(limit = 100): AutomationJob[] {
  return rows<{
    id: number;
    draft_id: number;
    account_id: number | null;
    handle: string | null;
    action: string;
    scheduled_at: number;
    status: string;
    receipt: string;
    reason: string;
    xuse_queue_id: string;
    remote_url: string;
    reconciliation_status: string;
    attempts: number;
    created_at: number;
    updated_at: number;
  }>(`SELECT automation_jobs.id, draft_id, automation_jobs.account_id, accounts.handle,
      action, scheduled_at, automation_jobs.status, receipt, automation_jobs.reason,
      xuse_queue_id, remote_url, reconciliation_status,
      attempts, automation_jobs.created_at, automation_jobs.updated_at
      FROM automation_jobs LEFT JOIN accounts ON accounts.id=automation_jobs.account_id
      ORDER BY scheduled_at ASC, automation_jobs.id DESC LIMIT ${sqlNumber(limit)};`).map((job) => ({
    id: job.id,
    draftId: job.draft_id,
    accountId: job.account_id,
    accountHandle: job.handle || "atanmamış",
    action: job.action,
    scheduledAt: job.scheduled_at,
    status: job.status,
    receipt: job.receipt,
    reason: job.reason,
    xuseQueueId: job.xuse_queue_id || "",
    remoteUrl: job.remote_url || "",
    reconciliationStatus: job.reconciliation_status || "not_started",
    attempts: job.attempts,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }));
}

export function createJob(input: {
  draftId: number;
  accountId?: number | null;
  action: string;
  scheduledAt: number;
  now: number;
}): AutomationJob {
  const accountSql = input.accountId ? sqlNumber(input.accountId) : "NULL";
  const existing = rows<{ id: number }>(`SELECT id FROM automation_jobs
    WHERE draft_id=${sqlNumber(input.draftId)} AND account_id IS ${input.accountId ? "NOT NULL" : "NULL"}
      ${input.accountId ? `AND account_id=${accountSql}` : ""}
      AND action=${sqlString(input.action)}
      AND status IN ('queued','running','submitted','pending_reconciliation')
    ORDER BY id DESC LIMIT 1;`)[0];
  if (existing) {
    const current = getJobs(500).find((job) => job.id === existing.id);
    if (current) return current;
  }
  exec(`INSERT INTO automation_jobs (draft_id, account_id, action, scheduled_at, created_at, updated_at)
    VALUES (${sqlNumber(input.draftId)}, ${accountSql},
      ${sqlString(input.action)}, ${sqlNumber(input.scheduledAt)}, ${sqlNumber(input.now)}, ${sqlNumber(input.now)});`);
  const result = getJobs(500).sort((left, right) => right.id - left.id)[0];
  if (!result) throw new Error("job could not be created");
  return result;
}

export function updateJob(input: {
  id: number;
  status?: string;
  receipt?: string;
  reason?: string;
  xuseQueueId?: string;
  remoteUrl?: string;
  reconciliationStatus?: string;
  attempts?: number;
  now: number;
}): AutomationJob | null {
  const current = getJobs(200).find((job) => job.id === input.id);
  if (!current) return null;
  exec(`UPDATE automation_jobs SET status=${sqlString(input.status ?? current.status)},
    receipt=${sqlString(input.receipt ?? current.receipt)}, reason=${sqlString(input.reason ?? current.reason)},
    xuse_queue_id=${sqlString(input.xuseQueueId ?? current.xuseQueueId)},
    remote_url=${sqlString(input.remoteUrl ?? current.remoteUrl)},
    reconciliation_status=${sqlString(input.reconciliationStatus ?? current.reconciliationStatus)},
    attempts=${sqlNumber(input.attempts ?? current.attempts)}, updated_at=${sqlNumber(input.now)}
    WHERE id=${sqlNumber(input.id)};`);
  return getJobs(200).find((job) => job.id === input.id) || null;
}

function parseNumberArray(value: string): number[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(Number).filter((item) => Number.isInteger(item) && item > 0) : [];
  } catch {
    return [];
  }
}

function batchFromRow(row: {
  id: string;
  prompt: string;
  format: string;
  variant_mode: string;
  account_ids_json: string;
  provider: string;
  model: string;
  status: string;
  created_at: number;
  updated_at: number;
}): DraftBatch {
  return {
    id: row.id,
    prompt: row.prompt,
    format: row.format,
    variantMode: row.variant_mode === "same_text" ? "same_text" : "per_account",
    accountIds: parseNumberArray(row.account_ids_json),
    provider: row.provider,
    model: row.model,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDraftBatch(input: {
  id?: string;
  prompt: string;
  format: string;
  variantMode: "per_account" | "same_text";
  accountIds: number[];
  provider: string;
  model: string;
  status?: string;
  now: number;
}): DraftBatch {
  const id = input.id || `batch_${randomUUID()}`;
  exec(`INSERT INTO draft_batches
    (id, prompt, format, variant_mode, account_ids_json, provider, model, status, created_at, updated_at)
    VALUES (${sqlString(id)}, ${sqlString(input.prompt)}, ${sqlString(input.format)},
      ${sqlString(input.variantMode)}, ${sqlString(JSON.stringify(input.accountIds))},
      ${sqlString(input.provider)}, ${sqlString(input.model)}, ${sqlString(input.status || "draft")},
      ${sqlNumber(input.now)}, ${sqlNumber(input.now)});`);
  const batch = getDraftBatch(id);
  if (!batch) throw new Error("draft batch could not be created");
  return batch;
}

export function getDraftBatch(id: string): DraftBatch | null {
  const row = rows<{
    id: string;
    prompt: string;
    format: string;
    variant_mode: string;
    account_ids_json: string;
    provider: string;
    model: string;
    status: string;
    created_at: number;
    updated_at: number;
  }>(`SELECT id, prompt, format, variant_mode, account_ids_json, provider, model, status,
      created_at, updated_at FROM draft_batches WHERE id=${sqlString(id)} LIMIT 1;`)[0];
  return row ? batchFromRow(row) : null;
}

export function updateDraftBatch(id: string, status: string, now: number): DraftBatch | null {
  exec(`UPDATE draft_batches SET status=${sqlString(status)}, updated_at=${sqlNumber(now)} WHERE id=${sqlString(id)};`);
  return getDraftBatch(id);
}

export function getDraftsByBatch(id: string): DraftRecord[] {
  return getDrafts(500).filter((draft) => draft.batchId === id);
}

export function recordUsageEvent(input: {
  kind: string;
  provider: string;
  model: string;
  units?: number;
  estimatedUsd?: number;
  metadata?: Record<string, unknown>;
  now: number;
}): UsageEvent {
  exec(`INSERT INTO usage_events
    (kind, provider, model, units, estimated_usd, metadata_json, created_at)
    VALUES (${sqlString(input.kind)}, ${sqlString(input.provider)}, ${sqlString(input.model)},
      ${sqlNumber(input.units || 1)}, ${Number.isFinite(input.estimatedUsd) ? input.estimatedUsd : 0},
      ${sqlString(JSON.stringify(input.metadata || {}))}, ${sqlNumber(input.now)});`);
  const row = rows<{
    id: number;
    kind: string;
    provider: string;
    model: string;
    units: number;
    estimated_usd: number;
    metadata_json: string;
    created_at: number;
  }>("SELECT id, kind, provider, model, units, estimated_usd, metadata_json, created_at FROM usage_events ORDER BY id DESC LIMIT 1;")[0];
  if (!row) throw new Error("usage event could not be recorded");
  return {
    id: row.id,
    kind: row.kind,
    provider: row.provider,
    model: row.model,
    units: row.units,
    estimatedUsd: row.estimated_usd,
    metadata: parseObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

export function getUsageSummary(since = 0): {
  events: number;
  units: number;
  estimatedUsd: number;
  byProvider: Array<{ provider: string; units: number; estimatedUsd: number }>;
} {
  const total = rows<{ events: number; units: number; estimatedUsd: number }>(`SELECT COUNT(*) as events,
      COALESCE(SUM(units), 0) as units, COALESCE(SUM(estimated_usd), 0) as estimatedUsd
      FROM usage_events WHERE created_at >= ${sqlNumber(since)};`)[0] || { events: 0, units: 0, estimatedUsd: 0 };
  return {
    events: total.events,
    units: total.units,
    estimatedUsd: total.estimatedUsd,
    byProvider: rows<{ provider: string; units: number; estimatedUsd: number }>(`SELECT provider,
      COALESCE(SUM(units), 0) as units, COALESCE(SUM(estimated_usd), 0) as estimatedUsd
      FROM usage_events WHERE created_at >= ${sqlNumber(since)} GROUP BY provider ORDER BY units DESC;`),
  };
}

export function createChatSession(title = "Yeni konuşma", now = Math.floor(Date.now() / 1000)): ChatSession {
  const id = `chat_${randomUUID()}`;
  exec(`INSERT INTO chat_sessions (id, title, created_at, updated_at)
    VALUES (${sqlString(id)}, ${sqlString(title.slice(0, 80))}, ${sqlNumber(now)}, ${sqlNumber(now)});`);
  return getChatSession(id)!;
}

export function getChatSessions(limit = 20): ChatSession[] {
  return rows<ChatSession>(`SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM chat_sessions ORDER BY updated_at DESC LIMIT ${sqlNumber(limit)};`);
}

export function getChatSession(id: string): ChatSession | null {
  return rows<ChatSession>(`SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM chat_sessions WHERE id=${sqlString(id)} LIMIT 1;`)[0] || null;
}

export function createChatMessage(input: {
  sessionId: string;
  role: ChatMessage["role"];
  content: string;
  intent?: Record<string, unknown> | null;
  now: number;
}): ChatMessage {
  exec(`INSERT INTO chat_messages (session_id, role, content, intent_json, created_at)
    VALUES (${sqlString(input.sessionId)}, ${sqlString(input.role)}, ${sqlString(input.content)},
      ${sqlString(input.intent ? JSON.stringify(input.intent) : "")}, ${sqlNumber(input.now)});
    UPDATE chat_sessions SET updated_at=${sqlNumber(input.now)} WHERE id=${sqlString(input.sessionId)};`);
  const row = rows<{
    id: number;
    session_id: string;
    role: string;
    content: string;
    intent_json: string;
    created_at: number;
  }>(`SELECT id, session_id, role, content, intent_json, created_at FROM chat_messages
      WHERE session_id=${sqlString(input.sessionId)} ORDER BY id DESC LIMIT 1;`)[0];
  if (!row) throw new Error("chat message could not be created");
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role === "assistant" || row.role === "system" ? row.role : "user",
    content: row.content,
    intent: row.intent_json ? parseObject(row.intent_json) : null,
    createdAt: row.created_at,
  };
}

export function getChatMessages(sessionId: string, limit = 100): ChatMessage[] {
  return rows<{
    id: number;
    session_id: string;
    role: string;
    content: string;
    intent_json: string;
    created_at: number;
  }>(`SELECT id, session_id, role, content, intent_json, created_at FROM chat_messages
      WHERE session_id=${sqlString(sessionId)} ORDER BY created_at ASC, id ASC LIMIT ${sqlNumber(limit)};`).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role === "assistant" || row.role === "system" ? row.role : "user",
    content: row.content,
    intent: row.intent_json ? parseObject(row.intent_json) : null,
    createdAt: row.created_at,
  }));
}

export function createChatAction(input: {
  sessionId: string;
  messageId: number;
  kind: string;
  payload: Record<string, unknown>;
  status?: string;
  reason?: string;
  now: number;
}): ChatAction {
  exec(`INSERT INTO chat_actions (session_id, message_id, kind, payload_json, status, reason, created_at)
    VALUES (${sqlString(input.sessionId)}, ${sqlNumber(input.messageId)}, ${sqlString(input.kind)},
      ${sqlString(JSON.stringify(input.payload))}, ${sqlString(input.status || "pending_confirmation")},
      ${sqlString(input.reason || "")}, ${sqlNumber(input.now)});`);
  return getChatActions(input.sessionId, 1)[0];
}

export function getChatActions(sessionId: string, limit = 100): ChatAction[] {
  return rows<{
    id: number;
    session_id: string;
    message_id: number;
    kind: string;
    payload_json: string;
    status: string;
    reason: string;
    created_at: number;
    executed_at: number | null;
  }>(`SELECT id, session_id, message_id, kind, payload_json, status, reason, created_at, executed_at
      FROM chat_actions WHERE session_id=${sqlString(sessionId)} ORDER BY id DESC LIMIT ${sqlNumber(limit)};`).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    messageId: row.message_id,
    kind: row.kind,
    payload: parseObject(row.payload_json),
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    executedAt: row.executed_at,
  }));
}

export function getChatAction(id: number): ChatAction | null {
  return getChatActionsById(id)[0] || null;
}

function getChatActionsById(id: number): ChatAction[] {
  return rows<{
    id: number;
    session_id: string;
    message_id: number;
    kind: string;
    payload_json: string;
    status: string;
    reason: string;
    created_at: number;
    executed_at: number | null;
  }>(`SELECT id, session_id, message_id, kind, payload_json, status, reason, created_at, executed_at
      FROM chat_actions WHERE id=${sqlNumber(id)} LIMIT 1;`).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    messageId: row.message_id,
    kind: row.kind,
    payload: parseObject(row.payload_json),
    status: row.status,
    reason: row.reason,
    createdAt: row.created_at,
    executedAt: row.executed_at,
  }));
}

export function updateChatAction(input: { id: number; status: string; reason?: string; now: number }): ChatAction | null {
  const current = getChatAction(input.id);
  if (!current) return null;
  const executedAt = ["executed", "rejected", "failed"].includes(input.status) ? sqlNumber(input.now) : "NULL";
  exec(`UPDATE chat_actions SET status=${sqlString(input.status)}, reason=${sqlString(input.reason || current.reason)},
      executed_at=${executedAt} WHERE id=${sqlNumber(input.id)};`);
  return getChatAction(input.id);
}

export function getSecretCiphertext(name: string): { provider: string; ciphertext: string; updatedAt: number } | null {
  const secret = rows<{ provider: string; ciphertext: string; updated_at: number }>(
    `SELECT provider, ciphertext, updated_at FROM secrets WHERE name=${sqlString(name)} LIMIT 1;`,
  )[0];
  return secret ? { provider: secret.provider, ciphertext: secret.ciphertext, updatedAt: secret.updated_at } : null;
}

export function saveSecretCiphertext(name: string, provider: string, ciphertext: string, now: number): void {
  exec(`INSERT INTO secrets (name, provider, ciphertext, updated_at)
    VALUES (${sqlString(name)}, ${sqlString(provider)}, ${sqlString(ciphertext)}, ${sqlNumber(now)})
    ON CONFLICT(name) DO UPDATE SET provider=excluded.provider, ciphertext=excluded.ciphertext, updated_at=excluded.updated_at;`);
}

export function deleteSecret(name: string): void {
  exec(`DELETE FROM secrets WHERE name=${sqlString(name)};`);
}

export function getSecretMetas(mask: (name: string) => string): SecretMeta[] {
  return rows<{ name: string; provider: string; updated_at: number }>(
    "SELECT name, provider, updated_at FROM secrets ORDER BY name;",
  ).map((secret) => ({
    name: secret.name,
    provider: secret.provider,
    configured: true,
    masked: mask(secret.name),
    updatedAt: secret.updated_at,
  }));
}

export function getSetting(name: string, fallback = ""): string {
  return rows<{ value: string }>(`SELECT value FROM app_settings WHERE name=${sqlString(name)} LIMIT 1;`)[0]?.value || fallback;
}

export function setSetting(name: string, value: string, now: number): void {
  exec(`INSERT INTO app_settings (name, value, updated_at)
    VALUES (${sqlString(name)}, ${sqlString(value)}, ${sqlNumber(now)})
    ON CONFLICT(name) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`);
}

export function getAnalytics(): {
  drafts: number;
  queued: number;
  confirmed: number;
  blocked: number;
  failed: number;
  feedback: number;
} {
  const result = rows<{ drafts: number; queued: number; confirmed: number; blocked: number; failed: number; feedback: number }>(`SELECT
    (SELECT COUNT(*) FROM drafts) as drafts,
    (SELECT COUNT(*) FROM automation_jobs WHERE status IN ('queued','running','submitted','pending_reconciliation')) as queued,
    (SELECT COUNT(*) FROM automation_jobs WHERE status='confirmed') as confirmed,
    (SELECT COUNT(*) FROM automation_jobs WHERE status='blocked') as blocked,
    (SELECT COUNT(*) FROM automation_jobs WHERE status='failed') as failed,
    (SELECT COUNT(*) FROM feedback_snapshots) as feedback;`)[0];
  return result || { drafts: 0, queued: 0, confirmed: 0, blocked: 0, failed: 0, feedback: 0 };
}
