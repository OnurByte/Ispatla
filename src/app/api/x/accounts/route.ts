import { NextResponse } from "next/server";
import { guardMutation } from "@/server/api-guard";
import { getLoggedXUseAccounts } from "@/server/xuse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try { return NextResponse.json({ accounts: await getLoggedXUseAccounts() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "x-use hesapları alınamadı" }, { status: 424 }); }
}
