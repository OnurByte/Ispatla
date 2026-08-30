import { expect, test } from "bun:test";
import { officialXCapability, publish } from "@/server/publisher";

const account = { id: 1, accountKey: "main", handle: "main", displayName: "Main", xuseAccountId: "", enabled: true, defaultAccount: true, automationMode: "auto" as const, dailyLimit: 24, capabilities: [], styleProfile: {}, subscriptionHistory: [], subscriptionState: { tier: "unknown" as const, observedAt: 0, historyComplete: false }, updatedAt: 1 };

test("uses an account-scoped official user token and keeps its receipt identity", async () => {
  const previous = process.env.ISPATLA_X_ACCESS_TOKEN_MAIN;
  const originalFetch = globalThis.fetch;
  process.env.ISPATLA_X_ACCESS_TOKEN_MAIN = "test-token";
  globalThis.fetch = (async (url, init) => {
    expect(String(url)).toBe("https://api.x.com/2/tweets");
    expect(init?.headers).toMatchObject({ authorization: "Bearer test-token" });
    expect(init?.body).toBe(JSON.stringify({ text: "hello" }));
    return new Response(JSON.stringify({ data: { id: "123" } }));
  }) as typeof fetch;
  try {
    expect(officialXCapability(account).available).toBe(true);
    await expect(publish({ account, text: "hello" })).resolves.toMatchObject({ ok: true, transport: "official", remoteUrl: "https://x.com/main/status/123" });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ISPATLA_X_ACCESS_TOKEN_MAIN;
    else process.env.ISPATLA_X_ACCESS_TOKEN_MAIN = previous;
  }
});

test("retains an official rate-limit reset instead of retrying through x-use", async () => {
  const previous = process.env.ISPATLA_X_ACCESS_TOKEN_MAIN;
  const originalFetch = globalThis.fetch;
  process.env.ISPATLA_X_ACCESS_TOKEN_MAIN = "test-token";
  globalThis.fetch = (async () => new Response("slow down", { status: 429, headers: { "x-rate-limit-reset": "999" } })) as unknown as typeof fetch;
  try {
    await expect(publish({ account, text: "hello" })).resolves.toMatchObject({ ok: false, transport: "official", reason: "official X 429; rate-limit reset=999: slow down" });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ISPATLA_X_ACCESS_TOKEN_MAIN;
    else process.env.ISPATLA_X_ACCESS_TOKEN_MAIN = previous;
  }
});
