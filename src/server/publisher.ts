import type { Account } from "./db";
import { runXUseJob, xuseCapability } from "./xuse";

export type PublishInput = { account: Account; text: string; mediaPath?: string };
export type PublishReceipt = { ok: boolean; receipt: string; remoteUrl?: string; reason?: string; transport: "official" | "xuse" };

function tokenName(account: Account): string {
  return `ISPATLA_X_ACCESS_TOKEN_${account.accountKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

export function officialXCapability(account: Account): { available: boolean; reason: string } {
  return process.env[tokenName(account)]
    ? { available: true, reason: "" }
    : { available: false, reason: `${tokenName(account)} is missing` };
}

export async function publish(input: PublishInput): Promise<PublishReceipt> {
  const official = officialXCapability(input.account);
  if (official.available && !input.mediaPath) {
    try {
      const response = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env[tokenName(input.account)]}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ text: input.text }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      if (!response.ok) {
        const reset = response.status === 429 ? response.headers.get("x-rate-limit-reset") : null;
        return { ok: false, receipt: "", reason: `official X ${response.status}${reset ? `; rate-limit reset=${reset}` : ""}: ${body.slice(0, 400)}`, transport: "official" };
      }
      const value = JSON.parse(body) as { data?: { id?: unknown } };
      const id = typeof value.data?.id === "string" && /^\d+$/.test(value.data.id) ? value.data.id : "";
      if (!id) return { ok: false, receipt: body.slice(0, 400), reason: "official X response has no post id", transport: "official" };
      return { ok: true, receipt: body, remoteUrl: `https://x.com/${input.account.handle}/status/${id}`, transport: "official" };
    } catch (error) {
      return { ok: false, receipt: "", reason: `official X write failed: ${error instanceof Error ? error.message : String(error)}`, transport: "official" };
    }
  }
  const fallback = xuseCapability();
  if (!fallback.available) return { ok: false, receipt: "", reason: official.available && input.mediaPath ? "official X media upload is not configured and x-use is unavailable" : `${official.reason}; ${fallback.bin} is unavailable`, transport: "xuse" };
  const result = await runXUseJob({ action: "post", account: input.account.xuseAccountId, profileHandle: input.account.handle, text: input.text, mediaPath: input.mediaPath });
  return { ...result, transport: "xuse" };
}
