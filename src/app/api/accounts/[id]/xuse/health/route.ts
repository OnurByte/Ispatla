import { NextResponse } from "next/server";
import { guardMutation } from "@/server/api-guard";
import { getAccounts } from "@/server/db";
import { getXUseAccountHealth } from "@/server/xuse";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const { id } = await context.params;
  const account = getAccounts().find((item) => item.id === Number(id) && item.enabled && item.xuseAccountId);
  if (!account) return NextResponse.json({ error: "aktif x-use eşlenmiş hesap bulunamadı" }, { status: 422 });
  try { return NextResponse.json({ ok: true, health: await getXUseAccountHealth(account.xuseAccountId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "x-use health alınamadı" }, { status: 424 }); }
}
