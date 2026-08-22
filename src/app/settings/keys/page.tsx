import { AppShell } from "@/components/app-shell";
import { KeysPage } from "@/components/keys-page";
import { PageHeading } from "@/components/page-heading";
import { detectCodex, getAiSettings, modelOptions } from "@/server/ai";
import { listSecretMetas, secretOrEnv, vaultReady } from "@/server/vault";

export const dynamic = "force-dynamic";

export default function KeysRoute() {
  const ai = getAiSettings();
  const codex = detectCodex();
  const initialAi = {
    settings: ai,
    configured: ai.provider === "codex" ? codex.authenticated : Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY")),
    apiConfigured: Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY")),
    models: { api: modelOptions("api"), codex: modelOptions("codex") },
    codex,
  };
  return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[980px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Ayarlar / secrets" title="Key edit" description="OpenAI API, Codex ve x-use entegrasyonlarını sunucu tarafında maskeli yönet." /><KeysPage initialKeys={listSecretMetas()} initialVaultReady={vaultReady()} initialAi={initialAi} /></div></main></AppShell>;
}
