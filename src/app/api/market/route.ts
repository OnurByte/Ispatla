import { NextResponse } from "next/server";
import { getOpportunityItems } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getOpportunityItems());
}
