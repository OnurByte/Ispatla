import {
  createChatAction,
  createChatMessage,
  createChatSession,
  getAccounts,
  getAnalytics,
  getChatAction,
  getChatMessages,
  getChatSession,
  getJobs,
  getUsageSummary,
  updateChatAction,
  updateJob,
  type ChatAction,
  type ChatMessage,
  type ChatSession,
} from "./db";
import { requestAiIntent, type AiIntent } from "./ai";
import { createManualDraftBatch } from "./manual-drafts";
import { queueDraftIds, runAutomationJob } from "./queue-service";

export type ChatEnvelope = {
  session: ChatSession;
  messages: ChatMessage[];
  actions: ChatAction[];
};

function numbers(value: string): number[] {
  return value.split(/[ ,]+/).map(Number).filter((item) => Number.isInteger(item) && item > 0).slice(0, 100);
}

function handles(value: string): string[] {
  return value.split(/[ ,]+/).map((item) => item.replace(/^@/, "").trim().toLowerCase()).filter(Boolean).slice(0, 20);
}

function slashIntent(message: string): AiIntent | null {
  const match = message.trim().match(/^\/(\S+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  const command = match[1].toLowerCase();
  const rest = match[2] || "";
  const accountFlag = rest.match(/--accounts(?:=|\s+)([^\s]+)/i);
  const accountHandles = accountFlag ? handles(accountFlag[1]) : [];
  const same = /(?:^|\s)--same(?:\s|$)/i.test(rest);
  const withoutFlags = rest.replace(/--accounts(?:=|\s+)[^\s]+/ig, "").replace(/(?:^|\s)--same(?:\s|$)/ig, " ").trim();
  if (command === "post") return { kind: "save_text", prompt: "", text: withoutFlags.slice(0, 280), accountHandles, draftIds: [], jobIds: [], format: "post", variantMode: same ? "same_text" : "per_account", reason: "slash command" };
  if (command === "generate") return { kind: "generate_post", prompt: withoutFlags.slice(0, 1200), text: "", accountHandles, draftIds: [], jobIds: [], format: "post", variantMode: same ? "same_text" : "per_account", reason: "slash command" };
  if (command === "queue") return { kind: "queue_drafts", prompt: "", text: "", accountHandles: [], draftIds: numbers(withoutFlags), jobIds: [], format: "post", variantMode: "per_account", reason: "slash command" };
  if (command === "send") return { kind: "run_jobs", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: numbers(withoutFlags), format: "post", variantMode: "per_account", reason: "slash command" };
  if (command === "cancel") return { kind: "cancel_jobs", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: numbers(withoutFlags), format: "post", variantMode: "per_account", reason: "slash command" };
  if (command === "accounts") return { kind: "list_accounts", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: [], format: "post", variantMode: "per_account", reason: "slash command" };
  if (command === "status") return { kind: "read_status", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: [], format: "post", variantMode: "per_account", reason: "slash command" };
  if (command === "help") return { kind: "help", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: [], format: "post", variantMode: "per_account", reason: "slash command" };
  return { kind: "unknown", prompt: "", text: "", accountHandles: [], draftIds: [], jobIds: [], format: "post", variantMode: "per_account", reason: `Bilinmeyen komut: /${command}` };
}

function accountIds(accountHandles: string[]): number[] {
  const accounts = getAccounts().filter((account) => account.enabled);
  if (!accountHandles.length || accountHandles.includes("all")) return accounts.map((account) => account.id);
  const selected = accounts.filter((account) => accountHandles.includes(account.handle.toLowerCase()));
  const missing = accountHandles.filter((handle) => !selected.some((account) => account.handle.toLowerCase() === handle));
  if (missing.length) throw new Error(`aktif hesap bulunamadı: ${missing.map((handle) => `@${handle}`).join(", ")}`);
  return selected.map((account) => account.id);
}

function previewJobs(ids: number[]): string {
  const jobs = getJobs(300).filter((job) => ids.includes(job.id));
  if (!jobs.length) return "Seçilen job bulunamadı.";
  return jobs.map((job) => `#${job.id} @${job.accountHandle} ${job.action} · ${job.status}`).join("\n");
}

function helpText(): string {
  return "Komutlar: /generate <brief> --accounts hesap1,hesap2 | /post <hazır metin> --accounts ... | /queue 12,13 | /send 5,6 | /cancel 5 | /accounts | /status. Queue/send/cancel gerçek değişiklikten önce onay ister.";
}

async function resolveIntent(message: string): Promise<AiIntent> {
  const slash = slashIntent(message);
  if (slash) return slash;
  return requestAiIntent({ message });
}

export async function handleChatMessage(input: { sessionId?: string; message: string }): Promise<ChatEnvelope> {
  const message = input.message.trim().slice(0, 6000);
  if (!message) throw new Error("chat mesajı boş");
  const now = Math.floor(Date.now() / 1000);
  const existing = input.sessionId ? getChatSession(input.sessionId) : null;
  const session = existing || createChatSession(message.slice(0, 80), now);
  const userMessage = createChatMessage({ sessionId: session.id, role: "user", content: message, now });
  let intent: AiIntent;
  try {
    intent = await resolveIntent(message);
  } catch (error) {
    const response = createChatMessage({ sessionId: session.id, role: "assistant", content: `Mesajı anlayamadım: ${error instanceof Error ? error.message : "AI provider kullanılamıyor"}. Slash komutlarından birini kullanabilirsin.`, now: Math.floor(Date.now() / 1000) });
    return { session: getChatSession(session.id)!, messages: [...getChatMessages(session.id), response].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index), actions: [] };
  }

  let content = "";
  let action: ChatAction | undefined;
  switch (intent.kind) {
    case "generate_post":
    case "save_text": {
      const result = await createManualDraftBatch({
        prompt: intent.kind === "generate_post" ? intent.prompt : "",
        text: intent.kind === "save_text" ? intent.text : "",
        accountIds: accountIds(intent.accountHandles),
        format: intent.format,
        variantMode: intent.variantMode,
      });
      content = `${result.drafts.length} hesap için draft hazırlandı: ${result.drafts.map((draft) => `#${draft.id} @${draft.accountHandle}`).join(", ")}. Yayına almak için /queue ${result.drafts.map((draft) => draft.id).join(",")} yaz.`;
      break;
    }
    case "queue_drafts":
      if (!intent.draftIds.length) content = "Queue için draft id gerekli. Örnek: /queue 12,13";
      else {
        action = createChatAction({ sessionId: session.id, messageId: userMessage.id, kind: "queue_drafts", payload: { draftIds: intent.draftIds }, now });
        content = `Şu draftlar hesap başına kuyruğa alınacak:\n${intent.draftIds.map((id) => `#${id}`).join(", ")}\nOnaylarsan hiçbir toplu gönderim yapmadan her biri için ayrı job oluşturacağım.`;
      }
      break;
    case "run_jobs":
      if (!intent.jobIds.length) content = "Send için job id gerekli. Örnek: /send 5,6";
      else {
        action = createChatAction({ sessionId: session.id, messageId: userMessage.id, kind: "run_jobs", payload: { jobIds: intent.jobIds }, now });
        content = `Gerçek x-use çalıştırması için onay bekliyor:\n${previewJobs(intent.jobIds)}`;
      }
      break;
    case "cancel_jobs":
      if (!intent.jobIds.length) content = "Cancel için job id gerekli. Örnek: /cancel 5";
      else {
        action = createChatAction({ sessionId: session.id, messageId: userMessage.id, kind: "cancel_jobs", payload: { jobIds: intent.jobIds }, now });
        content = `Şu joblar iptal edilecek:\n${previewJobs(intent.jobIds)}`;
      }
      break;
    case "list_accounts":
      content = getAccounts().map((account) => `@${account.handle} · ${account.enabled ? "aktif" : "kapalı"} · x-use: ${account.xuseAccountId || "eşlenmemiş"}`).join("\n") || "Hesap yok.";
      break;
    case "list_queue":
      content = getJobs(20).map((job) => `#${job.id} @${job.accountHandle} ${job.action} · ${job.status}`).join("\n") || "Kuyruk boş.";
      break;
    case "read_status": {
      const analytics = getAnalytics();
      const usage = getUsageSummary(Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000));
      content = `Draft ${analytics.drafts} · queue ${analytics.queued} · confirmed ${analytics.confirmed} · blocked ${analytics.blocked}\nBu ay AI: ${usage.units} kredi · yaklaşık $${usage.estimatedUsd.toFixed(3)}.`;
      break;
    }
    case "help": content = helpText(); break;
    default: content = intent.reason || "Bu isteği güvenli allowlist içinde eşleyemedim.";
  }
  const assistant = createChatMessage({ sessionId: session.id, role: "assistant", content, intent: intent as unknown as Record<string, unknown>, now: Math.floor(Date.now() / 1000) });
  return { session: getChatSession(session.id)!, messages: [...getChatMessages(session.id), assistant].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index), actions: action ? [action] : [] };
}

export async function executeChatAction(id: number): Promise<{ action: ChatAction; message: ChatMessage }> {
  const action = getChatAction(id);
  if (!action) throw new Error("chat action bulunamadı");
  if (action.status !== "pending_confirmation") throw new Error("chat action zaten işlendi");
  const now = Math.floor(Date.now() / 1000);
  try {
    const ids = (value: unknown) => Array.isArray(value) ? value.map(Number).filter((item) => Number.isInteger(item) && item > 0) : [];
    if (action.kind === "queue_drafts") {
      const jobs = queueDraftIds(ids(action.payload.draftIds), now);
      updateChatAction({ id, status: "executed", reason: `${jobs.length} ayrı queue job oluşturuldu`, now });
    } else if (action.kind === "cancel_jobs") {
      const jobs = getJobs(300).filter((job) => ids(action.payload.jobIds).includes(job.id) && ["queued", "failed"].includes(job.status));
      for (const job of jobs) updateJob({ id: job.id, status: "cancelled", reason: "chat onayıyla iptal edildi", now });
      updateChatAction({ id, status: "executed", reason: `${jobs.length} job iptal edildi`, now });
    } else if (action.kind === "run_jobs") {
      const results = [];
      for (const jobId of ids(action.payload.jobIds)) results.push(await runAutomationJob(jobId));
      const success = results.filter((result) => result.ok).length;
      updateChatAction({ id, status: success ? "executed" : "failed", reason: `${success}/${results.length} job çalıştı`, now });
    } else {
      updateChatAction({ id, status: "rejected", reason: "bilinmeyen chat action", now });
    }
  } catch (error) {
    updateChatAction({ id, status: "failed", reason: error instanceof Error ? error.message : "action başarısız", now });
  }
  const updated = getChatAction(id)!;
  const message = createChatMessage({ sessionId: updated.sessionId, role: "assistant", content: `${updated.status === "executed" ? "Onay uygulandı" : "Onay uygulanamadı"}: ${updated.reason}`, now: Math.floor(Date.now() / 1000) });
  return { action: updated, message };
}
