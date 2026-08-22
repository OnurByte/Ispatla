"use client";

import { useState } from "react";
import { BrainCircuit, KeyRound, LockKeyhole, Save, Trash2 } from "lucide-react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type KeyMeta = { name: string; provider: string; configured: boolean; masked: string; updatedAt: number };
type AiProvider = "api" | "codex";
type AiPanel = {
  settings: { provider: AiProvider; model: string };
  configured: boolean;
  apiConfigured: boolean;
  models: Record<AiProvider, readonly string[]>;
  codex: { available: boolean; authenticated: boolean; bin: string; version: string; reason?: string };
};

export function KeysPage({ initialKeys, initialVaultReady, initialAi }: { initialKeys: KeyMeta[]; initialVaultReady: boolean; initialAi: AiPanel }) {
  const [keys, setKeys] = useState<KeyMeta[]>(initialKeys);
  const [vaultReady, setVaultReady] = useState(initialVaultReady);
  const [ai, setAi] = useState(initialAi);
  const [aiProvider, setAiProvider] = useState<AiProvider>(initialAi.settings.provider);
  const [aiModel, setAiModel] = useState(initialAi.settings.model);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  async function load() {
    const body = await fetch("/api/settings/keys", { cache: "no-store" }).then((response) => response.json());
    setKeys(body.keys || []);
    setVaultReady(body.vaultReady === true);
  }

  async function loadAi() {
    const response = await fetch("/api/settings/ai", { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json() as AiPanel;
    setAi(body);
    setAiProvider(body.settings.provider);
    setAiModel(body.settings.model);
  }

  async function save(key: KeyMeta) {
    setPending(key.name);
    const response = await fetch(`/api/settings/keys/${key.name}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: values[key.name] || "" }) });
    const body = await response.json().catch(() => ({}));
    setPending("");
    setMessage(response.ok ? `${key.provider} key kasaya yazıldı.` : body.error || "Key kaydedilemedi.");
    if (response.ok) {
      setValues((current) => ({ ...current, [key.name]: "" }));
      await load();
      await loadAi();
    }
  }

  async function remove(key: KeyMeta) {
    setPending(key.name);
    await fetch(`/api/settings/keys/${key.name}`, { method: "DELETE" });
    setPending("");
    setMessage(`${key.provider} key kaldırıldı.`);
    await load();
    await loadAi();
  }

  async function saveAi() {
    setPending("ai");
    const response = await fetch("/api/settings/ai", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: aiProvider, model: aiModel }),
    });
    const body = await response.json().catch(() => ({}));
    setPending("");
    setMessage(response.ok ? `${aiProvider === "codex" ? "Codex" : "OpenAI API"} çalıştırıcısı kaydedildi.` : body.error || "AI ayarı kaydedilemedi.");
    if (response.ok) await loadAi();
  }

  const aiModels = ai.models[aiProvider] || [];
  const aiReady = aiProvider === "codex" ? ai.codex.authenticated : ai.apiConfigured;

  return (
    <div className="flex flex-col gap-5">
      <Alert variant={vaultReady ? "default" : "destructive"}>
        <LockKeyhole aria-hidden="true" />
        <AlertDescription>
          {vaultReady ? "AES-256-GCM kasa hazır; raw değerler geri okunmaz." : "Kaydetmeden önce ISPATLA_SECRET_KEY environment secret’ını tanımla."}
        </AlertDescription>
        <AlertAction><Badge variant={vaultReady ? "default" : "destructive"}>{vaultReady ? "hazır" : "kurulmamış"}</Badge></AlertAction>
      </Alert>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <BrainCircuit aria-hidden="true" />
            <div>
              <CardTitle>AI çalıştırıcısı</CardTitle>
              <CardDescription>Skor ve draft çağrılarında OpenAI API veya yerel Codex hesabını seç.</CardDescription>
            </div>
          </div>
          <Badge variant={aiReady ? "default" : "destructive"}>{aiReady ? "hazır" : aiProvider === "codex" ? "login yok" : "key yok"}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ai-provider">Çalıştırıcı</FieldLabel>
              <Select value={aiProvider} onValueChange={(value) => {
                if (value !== "api" && value !== "codex") return;
                setAiProvider(value);
                setAiModel(ai.models[value][0] || "");
              }}>
                <SelectTrigger id="ai-provider" className="w-full" aria-label="AI çalıştırıcısı"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="api">OpenAI API · Responses</SelectItem>
                  <SelectItem value="codex">Codex · yerel CLI</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
              <FieldDescription>{aiProvider === "codex" ? `${ai.codex.bin}${ai.codex.version ? ` · ${ai.codex.version}` : ""}` : "OPENAI_API_KEY kasadan okunur; cevaplar store=false ile istenir."}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="ai-model">Model</FieldLabel>
              <Select value={aiModel} onValueChange={(value) => setAiModel(value || aiModels[0] || "")}>
                <SelectTrigger id="ai-model" className="w-full" aria-label="AI modeli"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{aiModels.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <FieldDescription>Terra, düşük güven veya sınır skorlarında ikinci görüş olarak otomatik kullanılabilir.</FieldDescription>
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveAi} disabled={!aiModel || pending !== ""}>
              {pending === "ai" ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" aria-hidden="true" />} AI ayarını kaydet
            </Button>
          </div>
          {!aiReady && <Alert variant="destructive"><AlertDescription>{aiProvider === "codex" ? (ai.codex.reason || "Codex login status doğrulanamadı.") : "OpenAI key edit alanından bir API anahtarı kaydet."}</AlertDescription></Alert>}
        </CardContent>
      </Card>

      {keys.map((key) => (
        <Card key={key.name}>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <KeyRound aria-hidden="true" />
              <div>
                <CardTitle>{key.provider}</CardTitle>
                <CardDescription>{key.name} · {key.configured ? key.masked : "ayarlı değil"}</CardDescription>
              </div>
            </div>
            <Badge variant={key.configured ? "secondary" : "outline"}>{key.configured ? "configured" : "missing"}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={key.name}>Yeni değer</FieldLabel>
              <FieldDescription>Değer yalnızca sunucu tarafı kasaya yazılır ve arayüzde tekrar gösterilmez.</FieldDescription>
              <Input id={key.name} type="password" autoComplete="new-password" value={values[key.name] || ""} onChange={(event) => setValues((current) => ({ ...current, [key.name]: event.target.value }))} placeholder="••••••••" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save(key)} disabled={!values[key.name] || pending !== ""}>
                {pending === key.name ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" aria-hidden="true" />} Güncelle
              </Button>
              {key.configured && (
                <Button variant="destructive" onClick={() => remove(key)} disabled={pending !== ""}>
                  {pending === key.name ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" aria-hidden="true" />} Kaldır
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
