import { NextResponse } from "next/server";
import { getSetting, getUsageSummary } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  const now = new Date();
  const since = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
  return NextResponse.json({ summary: getUsageSummary(since), monthlyBudgetUsd: Number(getSetting("ai_monthly_budget_usd", "0")) || 0, creditPolicy: { post: 15, quote: 25, reply: 25, dm: 25, thread: 100 } });
}
