"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import type { CategoryDefinition } from "@/server/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Draft = Omit<CategoryDefinition, "id" | "createdAt" | "updatedAt"> & { id?: number };
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const json = (value: Record<string, unknown>) => JSON.stringify(value, null, 2);
const parseJson = (value: string): Record<string, unknown> => {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Policy alanları JSON nesnesi olmalı.");
  return parsed as Record<string, unknown>;
};
const blank = (): Draft => ({ slug: "", name: "", enabled: true, builtIn: false, baseStrategy: "generic", clusterStrategy: "topic", verificationMode: "moderate", description: "", positiveExamples: [], negativeExamples: [], keywords: [], excludedKeywords: [], seedHandles: [], defaultFormats: ["post"], sourcePolicy: {}, riskPolicy: {}, scoringPolicy: {}, publishingPolicy: {}, aiContext: "" });
const draftFor = (item: CategoryDefinition): Draft => ({ ...item });

export function CategoriesPage({ initial }: { initial: CategoryDefinition[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<Draft>(blank());
  const [policies, setPolicies] = useState({ sourcePolicy: "{}", riskPolicy: "{}", scoringPolicy: "{}", publishingPolicy: "{}" });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const editing = Boolean(draft.id);
  const start = (item?: CategoryDefinition) => {
    const next = item ? draftFor(item) : blank();
    setDraft(next);
    setPolicies({ sourcePolicy: json(next.sourcePolicy), riskPolicy: json(next.riskPolicy), scoringPolicy: json(next.scoringPolicy), publishingPolicy: json(next.publishingPolicy) });
    setMessage("");
  };
  async function save() {
    setPending(true); setMessage("");
    try {
      const body = { ...draft, sourcePolicy: parseJson(policies.sourcePolicy), riskPolicy: parseJson(policies.riskPolicy), scoringPolicy: parseJson(policies.scoringPolicy), publishingPolicy: parseJson(policies.publishingPolicy) };
      const response = await fetch(editing ? `/api/categories/${draft.id}` : "/api/categories", { method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Kategori kaydedilemedi.");
      const next = await fetch("/api/categories", { cache: "no-store" }).then((item) => item.json() as Promise<CategoryDefinition[]>);
      setItems(next); start(); setMessage("Kategori kaydedildi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Kategori kaydedilemedi."); } finally { setPending(false); }
  }
  async function remove(item: CategoryDefinition) {
    if (!window.confirm(`${item.name} kategorisini silmek istiyor musun?`)) return;
    setPending(true); const response = await fetch(`/api/categories/${item.id}`, { method: "DELETE" }); const result = await response.json().catch(() => ({})); setPending(false);
    if (!response.ok) return setMessage(result.error || "Kategori silinemedi.");
    setItems((current) => current.filter((candidate) => candidate.id !== item.id)); if (draft.id === item.id) start(); setMessage("Kategori silindi.");
  }
  const changeList = (key: "positiveExamples" | "negativeExamples" | "keywords" | "excludedKeywords" | "seedHandles" | "defaultFormats", value: string) => setDraft({ ...draft, [key]: list(value) });
  return <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
    <Card><CardHeader><CardTitle>Kategoriler</CardTitle><CardDescription>Yerleşik şablonlar silinemez ama tüm skill/policy alanları düzenlenebilir.</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.slug} · {item.baseStrategy}/{item.clusterStrategy}</p></div><div className="flex items-center gap-2"><Badge variant={item.builtIn ? "secondary" : "outline"}>{item.builtIn ? "built-in" : "custom"}</Badge><Button size="icon" variant="ghost" disabled={pending} onClick={() => start(item)} aria-label={`${item.name} düzenle`}><Pencil aria-hidden="true" /></Button>{!item.builtIn && <Button size="icon" variant="ghost" disabled={pending} onClick={() => remove(item)} aria-label={`${item.name} sil`}><Trash2 aria-hidden="true" /></Button>}</div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>{editing ? `${draft.name || "Kategori"} düzenle` : "Yeni custom kategori"}</CardTitle><CardDescription>AI skill, kaynak sinyalleri ve bütün policy alanları burada saklanır.</CardDescription></CardHeader><CardContent><FieldGroup>
      <div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel>Ad</FieldLabel><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field><FieldLabel>Slug</FieldLabel><Input value={draft.slug} disabled={editing && draft.builtIn} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="monero" /></Field></div>
      <Field><FieldLabel>Açıklama</FieldLabel><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field><FieldLabel>Base strategy</FieldLabel><Select value={draft.baseStrategy} onValueChange={(value) => setDraft({ ...draft, baseStrategy: value as Draft["baseStrategy"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["generic", "news", "politics", "technology", "finance", "sports", "entertainment", "meme", "shitpost"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel>Cluster strategy</FieldLabel><Select value={draft.clusterStrategy} onValueChange={(value) => setDraft({ ...draft, clusterStrategy: value as Draft["clusterStrategy"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["event", "topic", "meme", "conversation", "format", "hybrid"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel>Doğrulama</FieldLabel><Select value={draft.verificationMode} onValueChange={(value) => setDraft({ ...draft, verificationMode: value as Draft["verificationMode"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["strict", "moderate", "minimal", "none"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field></div>
      <Field><FieldLabel>AI skill / yazım sözleşmesi</FieldLabel><Textarea value={draft.aiContext} onChange={(e) => setDraft({ ...draft, aiContext: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">{([ ["keywords", "Keywords"], ["excludedKeywords", "Hariç keywordler"], ["seedHandles", "Seed X hesapları"], ["defaultFormats", "Formatlar"], ["positiveExamples", "Pozitif örnekler"], ["negativeExamples", "Negatif örnekler"] ] as const).map(([key, label]) => <Field key={key}><FieldLabel>{label} (virgülle)</FieldLabel><Input value={draft[key].join(", ")} onChange={(e) => changeList(key, e.target.value)} /></Field>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">{([ ["sourcePolicy", "Source policy"], ["riskPolicy", "Risk policy"], ["scoringPolicy", "Scoring policy"], ["publishingPolicy", "Publishing policy"] ] as const).map(([key, label]) => <Field key={key}><FieldLabel>{label} (JSON)</FieldLabel><Textarea value={policies[key]} onChange={(e) => setPolicies({ ...policies, [key]: e.target.value })} /></Field>)}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Etkin</label>
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}<div className="flex gap-2"><Button onClick={save} disabled={pending}><Save data-icon="inline-start" aria-hidden="true" /> Kaydet</Button><Button variant="outline" onClick={() => start()} disabled={pending}><Plus data-icon="inline-start" aria-hidden="true" /> Yeni</Button></div>
    </FieldGroup></CardContent></Card>
  </div>;
}
