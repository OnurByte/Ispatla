import { NextResponse } from "next/server";
import { guardMutation } from "@/server/api-guard";
import { getAccounts, getJobs, updateJob } from "@/server/db";
import { syncXUseQueue } from "@/server/xuse";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const { id } = await context.params;
  const job = getJobs(300).find((item) => item.id === Number(id));
  const account = job && getAccounts().find((item) => item.id === job.accountId && item.xuseAccountId);
  if (!job || !account || !job.xuseQueueId) return NextResponse.json({ error: "eşlenmiş x-use queue işi bulunamadı" }, { status: 422 });
  try {
    const remote = await syncXUseQueue(account.xuseAccountId, job.xuseQueueId);
    const now = Math.floor(Date.now() / 1000);
    const status = remote.status === "cancelled" ? "cancelled" : remote.status === "failed" ? "blocked" : remote.status === "done" ? job.action === "post" ? "pending_reconciliation" : "executed" : job.status;
    return NextResponse.json({ remote, job: updateJob({ id: job.id, status, xuseStatus: remote.status || "missing", xuseCheckedAt: now, reason: remote.found ? job.reason : "x-use queue id bulunamadı; otomatik tekrar gönderilmedi", now }) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "x-use queue yenilenemedi" }, { status: 424 }); }
}
