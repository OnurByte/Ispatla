import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/server/dashboard";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getDashboardSummary());
}
