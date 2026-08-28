import { spawn, spawnSync } from "node:child_process";

export const X_USE_ACTIONS = ["post", "quote", "reply", "thread", "dm", "engage"] as const;
export type XUseAction = (typeof X_USE_ACTIONS)[number];

export type XUseCapability = {
  available: boolean;
  bin: string;
  help: string;
  actions: Record<XUseAction, boolean>;
  doctor: "ok" | "failed" | "unavailable";
  reason?: string;
};

export type XUseJobResult = {
  ok: boolean;
  receipt: string;
  queueId?: string;
  remoteUrl?: string;
  reason?: string;
};

function normalisePostText(value: string): string {
  return value.replace(/[\u200b\u200c\u200d]/g, "").replace(/\s+/g, " ").trim();
}

function commandAvailable(bin: string): boolean {
  const result = bin.includes("/")
    ? spawnSync("test", ["-x", bin], { encoding: "utf8" })
    : spawnSync("sh", ["-c", "command -v -- \"$1\"", "ispatla", bin], { encoding: "utf8" });
  return result.error == null && result.status === 0;
}

function emptyActions(): Record<XUseAction, boolean> {
  return { post: false, quote: false, reply: false, thread: false, dm: false, engage: false };
}

function inspectXUse(): XUseCapability {
  const bin = process.env.XUSE_BIN || "x-use";
  if (!commandAvailable(bin)) {
    return { available: false, bin, help: "", actions: emptyActions(), doctor: "unavailable", reason: `${bin} bulunamadı; x-use MCP kurulumu gerekli` };
  }
  const helpResult = spawnSync(/*turbopackIgnore: true*/ bin, ["--help"], { encoding: "utf8", timeout: 10_000, maxBuffer: 256 * 1024 });
  const help = `${helpResult.stdout || ""}\n${helpResult.stderr || ""}`.trim();
  const actions = emptyActions();
  actions.post = helpResult.error == null && /\bmcp\b/i.test(help);
  return {
    available: helpResult.error == null && helpResult.status === 0,
    bin,
    help,
    actions,
    doctor: "unavailable",
    reason: helpResult.error?.message || (!actions.post ? "x-use mcp komutu bulunamadı" : undefined),
  };
}

export function detectXUse(): XUseCapability {
  const capability = inspectXUse();
  if (!capability.available) return capability;
  const doctorResult = spawnSync(/*turbopackIgnore: true*/ capability.bin, ["doctor"], { encoding: "utf8", timeout: 20_000, maxBuffer: 256 * 1024 });
  return {
    ...capability,
    doctor: doctorResult.error == null && doctorResult.status === 0 ? "ok" : "failed",
    reason: doctorResult.error?.message || (doctorResult.status === 0 ? capability.reason : `${capability.bin} doctor başarısız`),
  };
}

export function xuseCapability(): { available: boolean; bin: string } {
  const capability = detectXUse();
  return {
    available: capability.available && capability.actions.post && capability.doctor === "ok",
    bin: capability.bin,
  };
}

type RpcResponse = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

type RpcClient = {
  call: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  notify: (method: string, params?: Record<string, unknown>) => void;
  close: () => void;
};

function jsonRpcClient(bin: string): RpcClient {
  const environment = { ...process.env } as NodeJS.ProcessEnv;
  delete environment.OPENAI_API_KEY;
  delete environment.OPENAI_BASE_URL;
  delete environment.OPENAI_MODEL;
  const child = spawn(/* turbopackIgnore: true */ bin, ["mcp"], {
    cwd: process.env.XUSE_CWD || process.cwd(),
    env: environment,
  });
  let nextId = 1;
  let buffer = "";
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: Buffer | string) => {
    stderr = `${stderr}${String(chunk)}`.slice(-4000);
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: Buffer | string) => {
    buffer += String(chunk);
    for (;;) {
      const newline = buffer.indexOf("\n");
      if (newline < 0) break;
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let message: RpcResponse;
      try {
        message = JSON.parse(line) as RpcResponse;
      } catch {
        continue;
      }
      if (typeof message.id !== "number") continue;
      const request = pending.get(message.id);
      if (!request) continue;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message || "x-use MCP error"));
      else request.resolve(message.result);
    }
  });
  child.once("error", (error: Error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  });

  const write = (message: Record<string, unknown>) => {
    if (!child.stdin || child.killed) throw new Error("x-use MCP stdin kapalı");
    child.stdin.write(`${JSON.stringify(message)}\n`);
  };
  return {
    call(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`x-use MCP ${method} timeout${stderr ? `: ${stderr.replace(/\s+/g, " ").trim()}` : ""}`));
        }, 120_000);
        pending.set(id, { resolve, reject, timer });
        try {
          write({ jsonrpc: "2.0", id, method, params });
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    },
    notify(method, params = {}) {
      write({ jsonrpc: "2.0", method, params });
    },
    close() {
      child.kill("SIGTERM");
    },
  };
}

function toolPayload(value: unknown): Record<string, unknown> {
  const result = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (result.isError) throw new Error("x-use MCP tool error");
  if (result.structuredContent && typeof result.structuredContent === "object") return result.structuredContent as Record<string, unknown>;
  const content = Array.isArray(result.content) ? result.content : [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as Record<string, unknown>).text;
    if (typeof text !== "string") continue;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { ok: true, message: text };
    }
  }
  return result;
}

async function callTool(client: RpcClient, name: string, arguments_: Record<string, unknown>): Promise<Record<string, unknown>> {
  return toolPayload(await client.call("tools/call", { name, arguments: arguments_ }));
}

export async function runXUseJob(input: {
  action: XUseAction;
  account: string;
  text: string;
  mediaPath?: string;
  existingQueueId?: string;
  profileHandle?: string;
}): Promise<XUseJobResult> {
  if (input.action !== "post") return { ok: false, receipt: "", reason: `${input.action} için güvenilir x-use MCP queue kontratı yok; yalnız original post çalıştırılabilir` };
  if (!input.account.trim()) return { ok: false, receipt: "", reason: "x-use account id boş" };
  const capability = detectXUse();
  if (!capability.available || !capability.actions.post || capability.doctor !== "ok") return { ok: false, receipt: "", reason: capability.reason || "x-use doctor başarılı değil" };
  const client = jsonRpcClient(capability.bin);
  try {
    await client.call("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ispatla", version: "0.1.0" },
    });
    client.notify("notifications/initialized");
    let queueId = input.existingQueueId || "";
    let queued: Record<string, unknown> = {};
    if (!queueId) {
      queued = await callTool(client, "queue_post", {
        account: input.account,
        text: input.text,
        media: input.mediaPath ? [input.mediaPath] : [],
      });
      queueId = String(queued.queue_id || queued.queueId || "");
      if (queued.ok === false || !queueId) throw new Error(String(queued.error || queued.message || "x-use queue_post queue id döndürmedi"));
    } else {
      queued = await callTool(client, "list_queue", { account: input.account });
      const item = (Array.isArray(queued.items) ? queued.items : []).find((candidate) => candidate && typeof candidate === "object" && String((candidate as Record<string, unknown>).queue_id || "") === queueId) as Record<string, unknown> | undefined;
      if (!item) return { ok: false, receipt: JSON.stringify({ queued }), queueId, reason: "x-use queue id artık görünmüyor; duplicate yayın riski nedeniyle tekrar queue edilmedi" };
      if (item.status === "done") return { ok: true, receipt: JSON.stringify({ queued, alreadyDone: true }), queueId };
      if (!["pending", "failed"].includes(String(item.status))) return { ok: false, receipt: JSON.stringify({ queued }), queueId, reason: `x-use queue durumu çalıştırılamaz: ${String(item.status)}` };
    }
    const processed = await callTool(client, "process_queue", { account: input.account, max_actions: 1 });
    const executed = Array.isArray(processed.executed) ? processed.executed : [];
    const succeeded = Number(processed.succeeded || 0);
    const success = succeeded > 0 || executed.some((item) => item && typeof item === "object" && (item as Record<string, unknown>).success === true);
    const receipt = JSON.stringify({ queued, processed });
    if (!success) return { ok: false, receipt, queueId, reason: String(processed.message || processed.error || "x-use process_queue işi çalıştırmadı; cap veya pacing nedeniyle bekliyor olabilir") };
    let remoteUrl = "";
    if (input.profileHandle) {
      try {
        const profile = await callTool(client, "search_profile", { profile: input.profileHandle, limit: 20, account: input.account });
        const tweets = Array.isArray(profile.tweets) ? profile.tweets : [];
        const match = tweets.find((tweet) => {
          if (!tweet || typeof tweet !== "object") return false;
          const value = tweet as Record<string, unknown>;
          return normalisePostText(String(value.text_content || value.text || "")) === normalisePostText(input.text);
        }) as Record<string, unknown> | undefined;
        remoteUrl = String(match?.tweet_url || match?.url || "");
      } catch {
        // The post result remains pending until the next reconciliation pass.
      }
    }
    return { ok: true, receipt, queueId, remoteUrl };
  } catch (error) {
    return { ok: false, receipt: "", reason: error instanceof Error ? error.message : String(error) };
  } finally {
    client.close();
  }
}

/** Kept for old callers/tests: synchronous direct `x-use post` is not a valid contract. */
export function runXUse(input: { action: XUseAction; text: string; mediaPath?: string }): XUseJobResult {
  return { ok: false, receipt: "", reason: `${input.action} için doğrudan x-use CLI kontratı yok; MCP queue adapter kullanılmalı` };
}
