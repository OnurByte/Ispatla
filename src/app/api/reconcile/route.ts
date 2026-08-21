import { NextResponse } from "next/server";
import { reconcilePending } from "@/server/pipeline";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({ confirmed: await reconcilePending() });
}
