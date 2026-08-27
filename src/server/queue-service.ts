import {
  createJob,
  getAccounts,
  getDraft,
  getPost,
  getSourceRights,
  getJobs,
  recordPublishAttempt,
  updateDraft,
  updateJob,
  type AutomationJob,
} from "./db";
import { runXUseJob, type XUseAction } from "./xuse";
import { downloadMedia, mediaCandidate } from "./pipeline";

export function queueDraftIds(draftIds: number[], now = Math.floor(Date.now() / 1000)): AutomationJob[] {
  const ids = [...new Set(draftIds)].filter((id) => Number.isInteger(id) && id > 0).slice(0, 100);
  if (!ids.length) throw new Error("En az bir draft seçilmeli");
  const accounts = getAccounts();
  const drafts = ids.map((id) => {
    const draft = getDraft(id);
    if (!draft) throw new Error(`draft #${id} bulunamadı`);
    if (draft.format !== "post") throw new Error(`draft #${id}: yalnız original post x-use queue ile çalıştırılabilir`);
    if (draft.status === "blocked") throw new Error(`draft #${id}: quality gate blokladı`);
    const account = accounts.find((item) => item.id === draft.accountId && item.enabled);
    if (!account?.xuseAccountId) throw new Error(`draft #${id}: aktif hesap veya x-use account id eşleşmesi yok`);
    return { draft, account };
  });
  return drafts.map(({ draft }) => {
    const job = createJob({ draftId: draft.id, accountId: draft.accountId, action: "post", scheduledAt: now, now });
    updateDraft({ id: draft.id, accountId: draft.accountId, status: "queued", now });
    return job;
  });
}

export async function runAutomationJob(id: number): Promise<{ ok: boolean; job: AutomationJob | null; reason?: string }> {
  const job = getJobs(200).find((item) => item.id === id);
  if (!job) throw new Error("job bulunamadı");
  if (!["queued", "failed"].includes(job.status)) throw new Error("job çalıştırılamaz");
  const draft = getDraft(job.draftId);
  if (!draft?.text) throw new Error("draft metni bulunamadı");
  const account = getAccounts().find((item) => item.id === job.accountId && item.enabled);
  if (!account?.xuseAccountId) throw new Error("job hesabı aktif değil veya x-use account id eşlenmemiş");
  const action = job.action as XUseAction;
  if (action !== "post") throw new Error("yalnız original post x-use MCP ile çalıştırılabilir");
  const now = Math.floor(Date.now() / 1000);
  let mediaPath = "";
  const post = draft.externalId ? getPost(draft.externalId) : null;
  if (post && getSourceRights(post.sourceHandle) === "cleared") {
    const candidate = mediaCandidate(post);
    if (candidate) {
      try { mediaPath = await downloadMedia(candidate); } catch { mediaPath = ""; }
    }
  }
  updateJob({ id, status: "running", attempts: job.attempts + 1, now });
  const result = await runXUseJob({ action, account: account.xuseAccountId, profileHandle: account.handle, text: draft.text, mediaPath: mediaPath || undefined, existingQueueId: job.xuseQueueId || undefined });
  const confirmed = result.ok && Boolean(result.remoteUrl);
  const updated = updateJob({
    id,
    status: confirmed ? "confirmed" : result.ok ? "pending_reconciliation" : "blocked",
    receipt: result.receipt,
    reason: result.reason || "x-use queue çalıştı; reconciliation bekleniyor",
    xuseQueueId: result.queueId || job.xuseQueueId,
    remoteUrl: result.remoteUrl || job.remoteUrl,
    reconciliationStatus: confirmed ? "confirmed" : result.ok ? "pending" : "failed",
    now: Math.floor(Date.now() / 1000),
  });
  if (result.ok && draft.externalId && job.reconciliationStatus === "not_started") {
    recordPublishAttempt({
      externalId: draft.externalId,
      accountId: account.id,
      status: confirmed ? "confirmed" : "pending_reconciliation",
      reason: confirmed ? "x-use search_profile exact text + author eşleşmesi bulundu" : "queue job x-use tarafından kabul edildi; FxTwitter reconciliation bekleniyor",
      receipt: result.receipt,
      remoteUrl: result.remoteUrl,
      now,
    });
  }
  return { ok: result.ok, job: updated, reason: result.reason };
}
