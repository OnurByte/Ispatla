import { NextResponse } from "next/server";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { createDraft, createJob, getAccounts } from "@/server/db";

export const runtime = "nodejs";

const targetUrl = (value: unknown) => {
  const url = typeof value === "string" ? value.trim() : "";
  try { const parsed = new URL(url); return parsed.protocol === "https:" && /(^|\.)((x|twitter)\.com)$/i.test(parsed.hostname) && /\/status\/\d+/.test(parsed.pathname) ? url : ""; } catch { return ""; }
};

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    const account = getAccounts().find((item) => item.id === Number(body.accountId) && item.enabled && item.xuseAccountId);
    const action = body.action === "like" || body.action === "retweet" || body.action === "reply" ? body.action : null;
    const sourceUrl = targetUrl(body.tweetUrl);
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 280) : "";
    if (!account || !action || !sourceUrl || (action === "reply" && !text)) return NextResponse.json({ error: "aktif hesap, geçerli hedef URL ve reply metni gerekli" }, { status: 422 });
    const externalId = sourceUrl.match(/\/status\/(\d+)/)?.[1] || "";
    const now = Math.floor(Date.now() / 1000);
    const draft = createDraft({ origin: "xuse_inspect", externalId, accountId: account.id, format: action, text, status: "ready", gateReason: "x-use hedefi doğrulandı", sourceUrl, now });
    const job = createJob({ draftId: draft.id, accountId: account.id, action, scheduledAt: now, now });
    return NextResponse.json({ draft, job, automatic: account.automationMode === "auto" }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "etkileşim planlanamadı" }, { status: 400 }); }
}
