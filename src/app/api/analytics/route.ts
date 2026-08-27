import { NextResponse } from "next/server";
import { getAiSettings, isAiEnabled } from "@/server/ai";
import { getAnalytics } from "@/server/db";

export const runtime = "nodejs";

export function GET() {
  const analytics = getAnalytics();
  const settings = getAiSettings();
  return NextResponse.json({ ...analytics, ai: { enabled: isAiEnabled(), provider: settings.provider, model: settings.model } });
}
