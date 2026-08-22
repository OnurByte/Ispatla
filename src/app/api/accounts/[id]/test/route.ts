import { NextResponse } from "next/server";
import { detectXUse } from "@/server/xuse";
import { guardMutation } from "@/server/api-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const capability = detectXUse();
  return NextResponse.json({ ok: capability.available && capability.actions.post && capability.doctor === "ok", capability });
}
