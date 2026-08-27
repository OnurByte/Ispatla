import { NextResponse } from "next/server";
import { getDeletedSources, upsertSource } from "@/server/db";
import { asIdeology, asIdeologyTags, asNiche, asTone, asTopics, loadSources } from "@/server/sources";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { checkSourceLiveness } from "@/server/pipeline";

export const runtime = "nodejs";

export function GET(request: Request) {
  return NextResponse.json(new URL(request.url).searchParams.get("view") === "deleted" ? getDeletedSources() : loadSources());
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    if (body.action === "check_liveness") return NextResponse.json(await checkSourceLiveness());
    const handle = String(body.handle || "").replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,15}$/.test(handle)) return NextResponse.json({ error: "geçerli X handle gerekli" }, { status: 400 });
    const source = {
      handle,
      name: String(body.name || handle),
      enabled: body.enabled !== false,
      maxPosts: Math.min(50, Math.max(1, Number(body.maxPosts || 20))),
      rightsStatus: body.rightsStatus === "cleared" || body.rightsStatus === "prohibited" ? body.rightsStatus : "unknown",
      profile: {
        origin: "manual",
        status: "active",
        pinned: true,
        niche: asNiche(body.niche),
        tone: asTone(body.tone),
        topics: asTopics(body.topics),
        ideology: asIdeology(body.ideology),
        ideologyTags: asIdeologyTags(body.ideologyTags),
      },
      feedUrl: `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses`,
    } as const;
    upsertSource(source, Math.floor(Date.now() / 1000));
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "kaynak kaydedilemedi" }, { status: 400 });
  }
}
