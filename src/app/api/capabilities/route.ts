import { NextResponse } from "next/server";
import { detectCodex, getAiSettings, modelOptions } from "@/server/ai";
import { detectXUse } from "@/server/xuse";
import { listSecretMetas, secretOrEnv, vaultReady } from "@/server/vault";

export const runtime = "nodejs";

export function GET() {
  const xuse = detectXUse();
  const ai = getAiSettings();
  const codex = detectCodex();
  const openaiConfigured = Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY"));
  return NextResponse.json({
    xuse,
    vault: { ready: vaultReady(), secrets: listSecretMetas() },
    openai: { configured: openaiConfigured },
    ai: {
      settings: ai,
      configured: ai.provider === "codex" ? codex.authenticated : openaiConfigured,
      models: { api: modelOptions("api"), codex: modelOptions("codex") },
      codex,
    },
  });
}
