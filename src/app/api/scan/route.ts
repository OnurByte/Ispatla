import { NextResponse } from "next/server";
import { scanOnce } from "@/server/pipeline";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(await scanOnce());
}
