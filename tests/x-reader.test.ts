import { expect, test } from "bun:test";
import { FxTwitterReader } from "@/server/x-reader";

test("FxTwitter reader keeps the allowlist and records a successful health check", async () => {
  const previous = globalThis.fetch;
  let url = "";
  globalThis.fetch = (async (input: string | URL | Request) => {
    url = String(input);
    return new Response(JSON.stringify({ results: [] }));
  }) as typeof fetch;
  try {
    const reader = new FxTwitterReader();
    await expect(reader.fetchProfile({ handle: "source" })).resolves.toEqual({ results: [] });
    expect(url).toBe("https://api.fxtwitter.com/2/profile/source");
    expect(reader.health()).toMatchObject({ transport: "fxtwitter", ok: true });
    await expect(reader.fetchJson("https://evil.example/feed")).rejects.toThrow("allowlist");
  } finally {
    globalThis.fetch = previous;
  }
});
