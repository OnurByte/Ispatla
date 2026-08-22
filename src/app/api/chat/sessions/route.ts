import { NextResponse } from "next/server";
import { getChatSessions } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getChatSessions());
}
