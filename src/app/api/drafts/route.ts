import { NextResponse } from "next/server";
import { createDraft, getDrafts, getPost, getAccounts } from "@/server/db";
import { generateDraft, qualityGate } from "@/server/pipeline";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getDrafts());
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    const externalId = String(body.externalId || "");
    const post = externalId ? getPost(externalId) : null;
    let text = String(body.text || "").trim();
    const format = String(body.format || "post");
    let status = "draft";
    let gateReason = "";
    if (!text && post) {
      const accountId = Number(body.accountId || 0);
      const account = getAccounts().find((item) => item.id === accountId);
      const style = account ? JSON.stringify(account.styleProfile) : "sade, kanıt odaklı";
      const generated = await generateDraft(post, { format, style });
      if (!("text" in generated)) return NextResponse.json({ error: generated.reason }, { status: 422 });
      text = generated.text;
      gateReason = format === "post" ? qualityGate(post, text) || "quality gate geçti" : "format için manuel kontrol bekliyor";
      status = gateReason.includes("gate geçti") || gateReason.includes("manuel") ? "ready" : "blocked";
    }
    if (!text) return NextResponse.json({ error: "text veya geçerli externalId gerekli" }, { status: 400 });
    const draft = createDraft({
      externalId,
      accountId: body.accountId ? Number(body.accountId) : null,
      format,
      text,
      status,
      gateReason,
      now: Math.floor(Date.now() / 1000),
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "draft oluşturulamadı" }, { status: 400 });
  }
}
