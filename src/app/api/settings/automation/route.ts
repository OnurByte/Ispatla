import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { detectXUse } from "@/server/xuse";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ paused: getSetting("automation_paused", "0") === "1", xuse: detectXUse() });
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  const paused = body.paused === true;
  setSetting("automation_paused", paused ? "1" : "0", Math.floor(Date.now() / 1000));
  return NextResponse.json({ paused });
}
