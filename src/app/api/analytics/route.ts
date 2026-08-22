import { NextResponse } from "next/server";
import { getAnalytics } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getAnalytics());
}
