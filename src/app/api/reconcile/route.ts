import { NextResponse } from "next/server";
import { guardMutation } from "@/server/api-guard";
import { reconcilePending } from "@/server/pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  return NextResponse.json({ confirmed: await reconcilePending() });
}
