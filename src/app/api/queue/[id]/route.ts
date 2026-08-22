import { NextResponse } from "next/server";
import { getJobs, updateJob } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

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
  const job = updateJob({ id, status, reason: status === "cancelled" ? "kullanıcı iptal etti" : undefined, now: Math.floor(Date.now() / 1000) });
  return NextResponse.json(job);
}
