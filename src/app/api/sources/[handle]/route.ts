import { NextResponse } from "next/server";
import { deleteSource, getStoredSources, recordSourceEvent, upsertSource } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { asNiche, asTone, asTopics } from "@/server/sources";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ handle: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const handle = (await context.params).handle.replace(/^@/, "").toLowerCase();
  const current = getStoredSources().find((source) => source.handle === handle);
  if (!current) return NextResponse.json({ error: "kaynak bulunamadı" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  const source = {
    ...current,
    name: String(body.name ?? current.name),
    enabled: body.enabled === undefined ? current.enabled : body.enabled === true,
    maxPosts: Math.min(50, Math.max(1, Number(body.maxPosts ?? current.maxPosts))),
    rightsStatus: body.rightsStatus === "cleared" || body.rightsStatus === "prohibited" ? body.rightsStatus : current.rightsStatus,
    profile: {
      ...current.profile,
      pinned: body.pinned === undefined ? current.profile.pinned === true : body.pinned === true,
      niche: body.niche === undefined ? current.profile.niche : asNiche(body.niche),
      tone: body.tone === undefined ? current.profile.tone : asTone(body.tone),
      topics: body.topics === undefined ? current.profile.topics : asTopics(body.topics, current.profile.topics),
    },
  };
  upsertSource(source, Math.floor(Date.now() / 1000));
  return NextResponse.json(source);
}

export async function DELETE(request: Request, context: { params: Promise<{ handle: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const handle = (await context.params).handle.replace(/^@/, "").toLowerCase();
  const current = getStoredSources().find((source) => source.handle === handle);
  if (current) {
    recordSourceEvent({
      handle,
      event: "deleted",
      score: Number(current.profile.sourceScore || 0),
      reason: "manual delete",
      model: String(current.profile.scoreModel || ""),
      now: Math.floor(Date.now() / 1000),
    });
  }
  deleteSource(handle);
  return NextResponse.json({ ok: true });
}
