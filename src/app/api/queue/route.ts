import { NextResponse } from "next/server";
import { getJobs } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getJobs());
}
