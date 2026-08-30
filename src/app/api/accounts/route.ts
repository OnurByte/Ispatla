import { NextResponse } from "next/server";
import { canonicalCategorySlugs, getAccounts, saveAccount, writingSkillIds } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { resolveIdeology } from "@/server/ideologies";
import { syncXUseAccounts } from "@/server/xuse-config";

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
    if (body.styleProfile && typeof body.styleProfile === "object") {
      const styleProfile = body.styleProfile as Record<string, unknown>;
      if ("ideology" in styleProfile && !resolveIdeology(styleProfile.ideology)) return NextResponse.json({ error: "ideoloji katalogdan seçilmeli" }, { status: 422 });
      if ("categories" in styleProfile && !canonicalCategorySlugs(styleProfile.categories)) return NextResponse.json({ error: "account kategorileri katalogdan seçilmeli" }, { status: 422 });
      if ("writingSkillIds" in styleProfile && !writingSkillIds(styleProfile.writingSkillIds)) return NextResponse.json({ error: "writing skill seçimi geçersiz" }, { status: 422 });
    }
    const account = saveAccount({
      accountKey,
      handle,
      displayName: String(body.displayName || handle),
      xuseAccountId: String(body.xuseAccountId || ""),
      enabled: body.enabled !== false,
      defaultAccount: body.defaultAccount === true,
      automationMode: body.automationMode === "auto" ? "auto" : "manual",
      dailyLimit: Math.min(100, Math.max(1, Number(body.dailyLimit || 24))),
      capabilities: Array.isArray(body.capabilities) ? body.capabilities.filter((item): item is string => typeof item === "string") : ["post"],
      styleProfile: body.styleProfile && typeof body.styleProfile === "object" ? body.styleProfile as Record<string, unknown> : {},
      now: Math.floor(Date.now() / 1000),
    });
    syncXUseAccounts(getAccounts());
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "account kaydedilemedi" }, { status: 400 });
  }
}
