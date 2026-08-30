import { NextResponse } from "next/server";
import { guardMutation } from "@/server/api-guard";
import { getAccounts } from "@/server/db";
import { getXUseAccountHealth, getXUseTimeline } from "@/server/xuse";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const { id } = await context.params;
  const account = getAccounts().find((item) => item.id === Number(id) && item.enabled && item.xuseAccountId);
  if (!account) return NextResponse.json({ error: "eşlenmiş aktif hesap bulunamadı" }, { status: 404 });
  try {
    const health = await getXUseAccountHealth(account.xuseAccountId);
    if (health.cookies.configured !== true || health.cookies.valid !== true) return NextResponse.json({ error: "x-use oturum cookie'si geçerli değil" }, { status: 422 });
    return NextResponse.json(await getXUseTimeline(account));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "timeline alınamadı" }, { status: 424 }); }
}
