import { NextResponse } from "next/server";
import { canonicalCategorySlugs, deleteAccount, getAccounts, saveAccount, writingSkillIds } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { resolveIdeology } from "@/server/ideologies";
import { syncXUseAccounts } from "@/server/xuse-config";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  const current = getAccounts().find((account) => account.id === id);
  if (!current) return NextResponse.json({ error: "account bulunamadı" }, { status: 404 });
  try {
    const body = await readJsonBody(request);
    if (body.styleProfile && typeof body.styleProfile === "object") {
      const styleProfile = body.styleProfile as Record<string, unknown>;
      if ("ideology" in styleProfile && !resolveIdeology(styleProfile.ideology)) return NextResponse.json({ error: "ideoloji katalogdan seçilmeli" }, { status: 422 });
      if ("categories" in styleProfile && !canonicalCategorySlugs(styleProfile.categories)) return NextResponse.json({ error: "account kategorileri katalogdan seçilmeli" }, { status: 422 });
      if ("writingSkillIds" in styleProfile && !writingSkillIds(styleProfile.writingSkillIds)) return NextResponse.json({ error: "writing skill seçimi geçersiz" }, { status: 422 });
    }
    const account = saveAccount({
      id,
      accountKey: String(body.accountKey || current.accountKey),
      handle: String(body.handle || current.handle).replace(/^@/, "").toLowerCase(),
      displayName: String(body.displayName ?? current.displayName),
      xuseAccountId: String(body.xuseAccountId ?? current.xuseAccountId),
      enabled: body.enabled === undefined ? current.enabled : body.enabled === true,
      defaultAccount: body.defaultAccount === undefined ? current.defaultAccount : body.defaultAccount === true,
      automationMode: body.automationMode === "auto" ? "auto" : body.automationMode === "manual" ? "manual" : current.automationMode,
      dailyLimit: Math.min(100, Math.max(1, Number(body.dailyLimit ?? current.dailyLimit))),
      capabilities: Array.isArray(body.capabilities) ? body.capabilities.filter((item): item is string => typeof item === "string") : current.capabilities,
      styleProfile: body.styleProfile && typeof body.styleProfile === "object" ? body.styleProfile as Record<string, unknown> : current.styleProfile,
      now: Math.floor(Date.now() / 1000),
    });
    syncXUseAccounts(getAccounts());
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "account güncellenemedi" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  if (!getAccounts().some((account) => account.id === id)) return NextResponse.json({ error: "account bulunamadı" }, { status: 404 });
  deleteAccount(id);
  syncXUseAccounts(getAccounts());
  return NextResponse.json({ ok: true });
}
