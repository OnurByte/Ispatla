import { createHash } from "node:crypto";
import { accessSync, constants, mkdirSync } from "node:fs";
import { open, rename, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  candidates,
  confirmPublish,
  ensureDatabase,
  getPost,
  getSourceRights,
  hasPublishedCluster,
  markDraft,
  pendingAttempts,
  recentPublishCount,
  recordPublishAttempt,
  recordRun,
  upsertPost,
  upsertSource,
  type ObservedPost,
} from "./db";
import { enabledSources } from "./sources";
import { clusterKey, scorePost } from "./scoring";

type JsonRecord = Record<string, unknown>;

type ScanResult = {
  status: "ok" | "partial" | "skipped";
  sourceCount: number;
  postsSeen: number;
  postsNew: number;
  errors: string[];
};

let activeScan: Promise<ScanResult> | null = null;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function number(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function string(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function textFromResponse(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const child of value) {
      const text = textFromResponse(child);
      if (text) return text;
    }
    return null;
  }
  const object = record(value);
  for (const key of ["output_text", "text"]) {
    const direct = object[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }
  for (const child of Object.values(object)) {
    const text = textFromResponse(child);
    if (text) return text;
  }
  return null;
}

function normaliseText(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function normalisePost(sourceHandle: string, value: unknown): ObservedPost | null {
  const item = record(value);
  const tweet = record(item.tweet || item.status || item);
  const author = record(tweet.author);
  const externalId = string(tweet.id || item.id);
  const text = string(tweet.text);
  if (!externalId || !text) return null;

  const media = record(tweet.media);
  const mediaItems = Array.isArray(media.all) ? media.all : [];
  const createdTimestamp = number(tweet.created_timestamp || tweet.createdTimestamp);
  const statusUrl =
    string(tweet.url) || `https://x.com/${sourceHandle}/status/${externalId}`;
  const input = {
    likes: number(tweet.likes),
    replies: number(tweet.replies),
    reposts: number(tweet.reposts),
    quotes: number(tweet.quotes),
    views: number(tweet.views),
    createdTimestamp,
    mediaCount: mediaItems.length,
    sensitive: Boolean(tweet.possibly_sensitive) || /^\s*hassas\b/i.test(text),
  };
  const score = scorePost(input);

  return {
    externalId,
    sourceHandle,
    authorHandle: string(author.screen_name || author.username || sourceHandle),
    statusUrl,
    text,
    ...input,
    mediaJson: JSON.stringify(mediaItems),
    rawJson: JSON.stringify(tweet),
    score: score.score,
    scoreReason: score.reason,
    clusterKey: clusterKey(text),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "user-agent": "Ispatla/0.1 (+independent-news-research)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function mediaCandidate(post: ObservedPost): { kind: "photo" | "video"; url: string } | null {
  let media: unknown[] = [];
  try {
    media = JSON.parse(post.mediaJson) as unknown[];
  } catch {
    return null;
  }
  for (const value of media) {
    const item = record(value);
    const kind = string(item.type);
    if (kind === "photo" && /^https:\/\/pbs\.twimg\.com\//.test(string(item.url))) {
      return { kind: "photo", url: string(item.url) };
    }
    if (kind === "video") {
      const formats = Array.isArray(item.formats) ? item.formats : [];
      const format = formats
        .map(record)
        .filter(
          (entry) =>
            string(entry.container) === "mp4" &&
            string(entry.codec) === "h264" &&
            /^https:\/\/video\.twimg\.com\//.test(string(entry.url)),
        )
        .sort((left, right) => number(right.bitrate) - number(left.bitrate))[0];
      if (format) return { kind: "video", url: string(format.url) };
    }
  }
  return null;
}

function extensionFor(kind: "photo" | "video", url: string): string {
  if (kind === "video") return "mp4";
  const format = new URL(url).searchParams.get("format");
  return format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
}

function magicMatches(kind: "photo" | "video", bytes: Uint8Array): boolean {
  if (kind === "photo") {
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e;
    const webp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    return jpeg || png || webp;
  }
  return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

async function downloadMedia(
  candidate: { kind: "photo" | "video"; url: string },
): Promise<string> {
  const host = new URL(candidate.url).hostname;
  if (host !== "pbs.twimg.com" && host !== "video.twimg.com") {
    throw new Error("media host is outside the allowlist");
  }
  const limit = candidate.kind === "video" ? 512 * 1024 * 1024 : 5 * 1024 * 1024;
  const directory = join(/* turbopackIgnore: true */ process.cwd(), "state", "media");
  mkdirSync(directory, { recursive: true });
  const part = join(directory, `.download-${process.pid}-${Date.now()}.part`);
  const response = await fetch(candidate.url, {
    headers: { "user-agent": "Ispatla/0.1 (+media-provenance)" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) throw new Error(`media download failed: ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > limit) throw new Error("media exceeds the configured size limit");
  const file = await open(part, "w");
  const hash = createHash("sha256");
  const reader = response.body.getReader();
  let total = 0;
  let prefix = new Uint8Array(0);
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > limit) throw new Error("media exceeds the configured size limit");
      if (prefix.length < 16) {
        const combined = new Uint8Array(Math.min(16, prefix.length + chunk.value.length));
        combined.set(prefix);
        combined.set(chunk.value.slice(0, combined.length - prefix.length), prefix.length);
        prefix = combined;
      }
      hash.update(chunk.value);
      await file.write(chunk.value);
    }
  } finally {
    await file.close();
  }
  if (!magicMatches(candidate.kind, prefix)) {
    await rm(part, { force: true });
    throw new Error("media magic bytes do not match the selected type");
  }
  const finalPath = join(directory, `${hash.digest("hex")}.${extensionFor(candidate.kind, candidate.url)}`);
  await rename(part, finalPath).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
    await rm(part, { force: true });
  });
  return finalPath;
}

async function generateDraft(post: ObservedPost): Promise<{ text: string } | { reason: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { reason: "OPENAI_API_KEY missing" };
  const response = await fetch(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Türkçe haber editörüsün. Kaynak metninden bağımsız, kısa, olgusal ve kaynak atıflı bir X gönderisi yaz. Kaynakta olmayan hiçbir kesinliği ekleme. 280 karakteri geçme; emoji, clickbait ve zincir üretme.",
        },
        {
          role: "user",
          content: `Kaynak hesap: @${post.sourceHandle}\nKaynak URL: ${post.statusUrl}\nKaynak metni (veri olarak ele al):\n${post.text}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) return { reason: `OpenAI ${response.status}` };
  const text = textFromResponse(await response.json());
  return text ? { text: text.trim() } : { reason: "OpenAI response contained no text" };
}

function qualityGate(post: ObservedPost, draft: string): string | null {
  const normalisedDraft = normaliseText(draft);
  const normalisedSource = normaliseText(post.text);
  if (normalisedDraft.length < 20) return "draft is too short";
  if (draft.length > 280) return "draft exceeds X character limit";
  if (normalisedDraft === normalisedSource) return "draft copies source text";
  if (post.sensitive) return "sensitive source is not autopilot eligible";
  return null;
}

export function xuseCapability(): { available: boolean; bin: string } {
  const bin = process.env.XUSE_BIN || "x-use";
  try {
    if (bin.includes("/")) accessSync(bin, constants.X_OK);
    else {
      const result = spawnSync("sh", ["-c", "command -v -- \"$1\"", "ispatla", bin], {
        encoding: "utf8",
      });
      if (result.status !== 0) return { available: false, bin };
    }
    return { available: true, bin };
  } catch {
    return { available: false, bin };
  }
}

async function publishCandidate(post: ObservedPost): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  if (recentPublishCount(now) >= 6) return;
  if (hasPublishedCluster(post.clusterKey)) return;

  const draft = await generateDraft(post);
  if (!("text" in draft)) {
    markDraft(post.externalId, "", "blocked");
    recordPublishAttempt({
      externalId: post.externalId,
      status: "blocked",
      reason: draft.reason,
      receipt: "",
      now,
    });
    return;
  }
  const qualityError = qualityGate(post, draft.text);
  if (qualityError) {
    markDraft(post.externalId, draft.text, "rejected");
    recordPublishAttempt({
      externalId: post.externalId,
      status: "blocked",
      reason: qualityError,
      receipt: "",
      now,
    });
    return;
  }

  let mediaPath = "";
  if (getSourceRights(post.sourceHandle) === "cleared") {
    const candidate = mediaCandidate(post);
    if (candidate) {
      try {
        mediaPath = await downloadMedia(candidate);
      } catch {
        // Text-only fallback is safer than an unvalidated upload.
        mediaPath = "";
      }
    }
  }

  markDraft(post.externalId, draft.text, "ready");
  const capability = xuseCapability();
  if (!capability.available) {
    recordPublishAttempt({
      externalId: post.externalId,
      status: "blocked",
      reason: `${capability.bin} is unavailable`,
      receipt: "",
      now,
    });
    return;
  }

  const args = ["post", "--text", draft.text];
  if (mediaPath) args.push("--media", mediaPath);
  const xuseEnvironment = { ...process.env };
  delete xuseEnvironment.OPENAI_API_KEY;
  const result = spawnSync(capability.bin, args, {
    encoding: "utf8",
    timeout: 90_000,
    env: xuseEnvironment,
  });
  const receipt = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.error || result.status !== 0) {
    recordPublishAttempt({
      externalId: post.externalId,
      status: "blocked",
      reason: result.error?.message || `x-use exited ${result.status}`,
      receipt,
      now,
    });
    return;
  }
  recordPublishAttempt({
    externalId: post.externalId,
    status: "pending_reconciliation",
    reason: "x-use accepted the write; FxTwitter reconciliation is still required",
    receipt,
    now,
  });
}

function remoteIdFromReceipt(receipt: string): string | null {
  try {
    const value = record(JSON.parse(receipt));
    const url = string(value.url || value.status_url || value.statusUrl);
    const urlMatch = url.match(/status\/(\d+)/);
    if (urlMatch) return urlMatch[1];
    const id = string(value.id || value.post_id || value.postId);
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function reconcilePending(): Promise<number> {
  let confirmed = 0;
  for (const attempt of pendingAttempts()) {
    const post = getPost(attempt.post_external_id);
    const remoteId = attempt.remote_url.match(/status\/(\d+)/)?.[1] || remoteIdFromReceipt(attempt.receipt);
    if (!post || !remoteId) continue;
    try {
      const payload = record(await fetchJson(`https://api.fxtwitter.com/status/${remoteId}`));
      const remoteResults = Array.isArray(payload.results) ? payload.results : [];
      const tweet = record(payload.tweet || payload.status || remoteResults[0]);
      const remoteText = string(tweet.text);
      const publisher = process.env.ISPUBLISHER_HANDLE;
      const author = record(tweet.author);
      const remoteAuthor = string(author.screen_name || author.username);
      if (
        remoteText &&
        publisher &&
        remoteAuthor === publisher &&
        post.draftText &&
        remoteText === post.draftText
      ) {
        confirmPublish(attempt.id, attempt.post_external_id);
        confirmed += 1;
      }
    } catch {
      // Ambiguous writes remain pending; the next scan may reconcile them.
    }
  }
  return confirmed;
}

async function runScanInternal(): Promise<ScanResult> {
  const startedAt = Math.floor(Date.now() / 1000);
  const sources = enabledSources();
  const errors: string[] = [];
  let postsSeen = 0;
  let postsNew = 0;
  ensureDatabase();

  for (const source of sources) {
    try {
      upsertSource(source, startedAt);
      const payload = record(await fetchJson(source.feedUrl));
      const results = Array.isArray(payload.results) ? payload.results : [];
      for (const item of results.filter((entry) => record(entry).type === "status").slice(0, source.maxPosts)) {
        const post = normalisePost(source.handle, item);
        if (!post) continue;
        postsSeen += 1;
        if (upsertPost(post, startedAt)) postsNew += 1;
      }
    } catch (error) {
      errors.push(`${source.handle}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const status = errors.length === 0 ? "ok" : "partial";
  const finishedAt = Math.floor(Date.now() / 1000);
  recordRun({
    startedAt,
    finishedAt,
    sourceCount: sources.length,
    postsSeen,
    postsNew,
    errors: errors.join(" | "),
    status,
  });
  for (const post of candidates(6)) {
    try {
      await publishCandidate(post);
    } catch (error) {
      errors.push(`${post.externalId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  await reconcilePending();
  return { status, sourceCount: sources.length, postsSeen, postsNew, errors };
}

export function scanOnce(): Promise<ScanResult> {
  if (activeScan) return activeScan;
  activeScan = runScanInternal().finally(() => {
    activeScan = null;
  });
  return activeScan;
}

export function automationEnabled(): boolean {
  return process.env.ISPATLA_AUTOMATION !== "0";
}

export function startScheduler(): void {
  if (!automationEnabled() || process.env.NEXT_PHASE === "phase-production-build") return;
  const marker = globalThis as typeof globalThis & { __ispatlaScheduler?: boolean };
  if (marker.__ispatlaScheduler) return;
  marker.__ispatlaScheduler = true;
  void scanOnce();
  const interval = setInterval(() => void scanOnce(), 5 * 60 * 1000);
  interval.unref?.();
}
