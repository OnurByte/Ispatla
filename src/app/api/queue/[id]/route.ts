import { NextResponse } from "next/server";
import { getAccounts, getJobs, updateJob } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { cancelXUseQueue, syncXUseQueue } from "@/server/xuse";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  if (!getJobs(200).some((job) => job.id === id)) return NextResponse.json({ error: "job bulunamadı" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  const status = ["queued", "cancelled"].includes(String(body.status)) ? String(body.status) : undefined;
  const current = getJobs(200).find((job) => job.id === id);
  if (status === "cancelled" && current?.xuseQueueId) {
    const account = getAccounts().find((item) => item.id === current.accountId && item.xuseAccountId);
    if (!account) return NextResponse.json({ error: "x-use hesabı bulunamadı" }, { status: 422 });
    try {
      const remote = await syncXUseQueue(account.xuseAccountId, current.xuseQueueId);
      if (!remote.found || !["pending", "failed"].includes(remote.status)) return NextResponse.json({ error: `x-use queue ${remote.status || "bulunamadı"}; yerel iş iptal edilmedi` }, { status: 409 });
      await cancelXUseQueue(current.xuseQueueId);
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "x-use iptal edilemedi" }, { status: 424 }); }
  }
  const job = updateJob({ id, status, reason: status === "cancelled" ? "kullanıcı iptal etti" : undefined, now: Math.floor(Date.now() / 1000) });
  return NextResponse.json(job);
}
