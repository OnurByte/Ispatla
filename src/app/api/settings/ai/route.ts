import { NextResponse } from "next/server";
import { detectCodex, getAiSettings, modelOptions, setAiSettings } from "@/server/ai";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { secretOrEnv } from "@/server/vault";

export const runtime = "nodejs";

function payload() {
  const settings = getAiSettings();
  const codex = detectCodex();
  const apiConfigured = Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY"));
  return {
    settings,
    configured: settings.provider === "codex" ? codex.authenticated : apiConfigured,
    apiConfigured,
    models: { api: modelOptions("api"), codex: modelOptions("codex") },
    codex,
  };
}

export function GET() {
  return NextResponse.json(payload());
}

export async function PUT(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  try {
    setAiSettings(String(body.provider || ""), String(body.model || ""));
    return NextResponse.json(payload());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI ayarı kaydedilemedi" }, { status: 400 });
  }
}
