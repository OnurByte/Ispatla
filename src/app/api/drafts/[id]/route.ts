import { NextResponse } from "next/server";
import { getDraft, updateDraft } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  if (!getDraft(id)) return NextResponse.json({ error: "draft bulunamadı" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  const draft = updateDraft({
    id,
    accountId: body.accountId === null ? null : body.accountId === undefined ? undefined : Number(body.accountId),
    format: body.format === undefined ? undefined : String(body.format),
    text: body.text === undefined ? undefined : String(body.text),
    status: body.status === undefined ? undefined : String(body.status),
    gateReason: body.gateReason === undefined ? undefined : String(body.gateReason),
    now: Math.floor(Date.now() / 1000),
  });
  return NextResponse.json(draft);
}
