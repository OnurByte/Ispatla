import { NextResponse } from "next/server";
import { getCompetitors, saveCompetitor } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getCompetitors());
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    const handle = String(body.handle || "").replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,15}$/.test(handle)) return NextResponse.json({ error: "geçerli X handle gerekli" }, { status: 400 });
    return NextResponse.json(saveCompetitor({
      handle,
      name: String(body.name || handle).slice(0, 120),
      category: String(body.category || "").slice(0, 240),
      enabled: body.enabled !== false,
      now: Math.floor(Date.now() / 1000),
    }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "rakip kaydedilemedi" }, { status: 400 });
  }
}
