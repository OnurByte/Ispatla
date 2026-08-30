import { isAllowedFxTwitterFeed } from "./security";

export type XReaderHealth = {
  transport: "fxtwitter";
  checkedAt: number;
  ok: boolean;
  error?: string;
};

export type SourceCursorInput = { handle: string; feedUrl: string };

export interface XReader {
  fetchSourceTimeline(input: SourceCursorInput): Promise<unknown>;
  fetchPostMetrics(input: { externalId: string }): Promise<unknown>;
  fetchProfile(input: { handle: string }): Promise<unknown>;
  health(): XReaderHealth;
}

export class FxTwitterReader implements XReader {
  private lastHealth: XReaderHealth = { transport: "fxtwitter", checkedAt: 0, ok: true };

  async fetchSourceTimeline(input: SourceCursorInput): Promise<unknown> {
    return this.fetchJson(input.feedUrl);
  }

  async fetchPostMetrics(input: { externalId: string }): Promise<unknown> {
    return this.fetchJson(`https://api.fxtwitter.com/status/${encodeURIComponent(input.externalId)}`);
  }

  async fetchProfile(input: { handle: string }): Promise<unknown> {
    return this.fetchJson(`https://api.fxtwitter.com/2/profile/${encodeURIComponent(input.handle)}`);
  }

  health(): XReaderHealth {
    return this.lastHealth;
  }

  async fetchJson(url: string): Promise<unknown> {
    if (!isAllowedFxTwitterFeed(url)) throw new Error("JSON URL is outside the FxTwitter allowlist");
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Ispatla/0.1 (+independent-news-research)" },
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      if (!response.body) throw new Error("response body missing");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          total += chunk.value.byteLength;
          if (total > 8 * 1024 * 1024) throw new Error("JSON response exceeds 8 MiB");
          chunks.push(chunk.value);
        }
      } catch (error) {
        await reader.cancel().catch(() => undefined);
        throw error;
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const result = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
      this.lastHealth = { transport: "fxtwitter", checkedAt: Math.floor(Date.now() / 1000), ok: true };
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastHealth = { transport: "fxtwitter", checkedAt: Math.floor(Date.now() / 1000), ok: false, error: message };
      throw error;
    }
  }
}
