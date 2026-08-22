import { NextResponse } from "next/server";
import { getAccounts, saveAccount } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getAccounts());
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    const handle = String(body.handle || "").replace(/^@/, "").toLowerCase();
    const accountKey = String(body.accountKey || handle);
    if (!/^[a-z0-9_]{1,15}$/.test(handle) || !/^[a-z0-9_-]{1,40}$/i.test(accountKey)) {
      return NextResponse.json({ error: "geçerli handle/account key gerekli" }, { status: 400 });
    }
    return NextResponse.json(saveAccount({
      accountKey,
      handle,
      displayName: String(body.displayName || handle),
      xuseAccountId: String(body.xuseAccountId || ""),
      enabled: body.enabled !== false,
      defaultAccount: body.defaultAccount === true,
      automationMode: body.automationMode === "auto" ? "auto" : "manual",
      dailyLimit: Math.min(100, Math.max(1, Number(body.dailyLimit || 6))),
      capabilities: Array.isArray(body.capabilities) ? body.capabilities.filter((item): item is string => typeof item === "string") : ["post"],
      styleProfile: body.styleProfile && typeof body.styleProfile === "object" ? body.styleProfile as Record<string, unknown> : {},
      now: Math.floor(Date.now() / 1000),
    }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "account kaydedilemedi" }, { status: 400 });
  }
}
