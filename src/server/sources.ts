import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceConfig } from "./db";

type RawSource = {
  handle?: unknown;
  name?: unknown;
  enabled?: unknown;
  maxPosts?: unknown;
  rightsStatus?: unknown;
  profile?: unknown;
  feedUrl?: unknown;
};

type SourceFile = { sources?: RawSource[] };

export function sourceConfigPath(): string {
  return process.env.ISPATLA_SOURCES || join(/* turbopackIgnore: true */ process.cwd(), "config", "sources.json");
}

function asHandle(value: unknown): string | null {
  const handle = String(value || "")
    .replace(/^@/, "")
    .toLowerCase();
  return /^[a-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

function asRightsStatus(value: unknown): SourceConfig["rightsStatus"] {
  return value === "cleared" || value === "prohibited" ? value : "unknown";
}

export function loadSources(): SourceConfig[] {
  const path = sourceConfigPath();
  if (!existsSync(path)) return [];

  try {
    const file = JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) as SourceFile;
    return (Array.isArray(file.sources) ? file.sources : []).flatMap((raw) => {
      const handle = asHandle(raw.handle);
      if (!handle) return [];
      return [
        {
          handle,
          name: String(raw.name || handle),
          enabled: raw.enabled !== false,
          maxPosts: Math.min(50, Math.max(1, Number(raw.maxPosts || 20))),
          rightsStatus: asRightsStatus(raw.rightsStatus),
          profile:
            raw.profile && typeof raw.profile === "object"
              ? (raw.profile as Record<string, unknown>)
              : {},
          feedUrl:
            typeof raw.feedUrl === "string" && raw.feedUrl.length > 0
              ? raw.feedUrl
              : `https://api.fxtwitter.com/2/profile/${handle}/statuses`,
        } satisfies SourceConfig,
      ];
    });
  } catch {
    return [];
  }
}

export function enabledSources(): SourceConfig[] {
  return loadSources().filter((source) => source.enabled);
}
