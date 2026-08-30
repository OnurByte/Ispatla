"use client";

import { useState } from "react";
import { BadgeCheck, Check, FlaskConical, Plus, Save, Trash2, UserRound } from "lucide-react";
import type { Account, CategoryDefinition, SubscriptionTier } from "@/server/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

type AccountDraft = Omit<Account, "id" | "updatedAt" | "capabilities" | "styleProfile"> & {
  id?: number;
  capabilities: string[];
  styleProfile: Record<string, unknown>;
};

function blankAccount(): AccountDraft {
  return {
    accountKey: "",
    handle: "",
    displayName: "",
    xuseAccountId: "",
    enabled: true,
    defaultAccount: false,
    automationMode: "manual",
    dailyLimit: 24,
    capabilities: ["post"],
    styleProfile: {},
    subscriptionHistory: [],
    subscriptionState: { tier: "unknown", observedAt: 0, historyComplete: false },
  };
}

function tierLabel(tier: SubscriptionTier): string {
  return ({ unknown: "Bilinmiyor", free: "Free", basic: "Basic", premium: "Premium", premium_plus: "Premium+", organization: "Organization" })[tier];
}

function verificationLabel(status: Account["publicVerificationStatus"]): string {
  return ({ blue: "Mavi doğrulama", organization: "Kuruluş doğrulaması", government: "Devlet doğrulaması", not_verified: "Doğrulanmamış", unknown: "Bilinmiyor" })[status || "unknown"];
}

function verificationClass(status: Account["publicVerificationStatus"]): string {
  return status === "blue" ? "text-primary" : status === "organization" ? "text-amber-600" : status === "government" ? "text-indigo-600" : "text-muted-foreground";
}

function dateTime(timestamp: number): string { return timestamp ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp * 1000)) : "Henüz yenilenmedi"; }

type IdeologyOption = { id: string; name: { en: string; tr: string } };

export function AccountsPage({ initial, ideologies, categories }: { initial: Account[]; ideologies: IdeologyOption[]; categories: CategoryDefinition[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [draft, setDraft] = useState<AccountDraft>(initial[0] || blankAccount());
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function select(account: Account) {
    setDraft({ ...account });
    setMessage("");
  }

  function setValue<K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setPending(true);
    setMessage("");
    const response = await fetch(draft.id ? `/api/accounts/${draft.id}` : "/api/accounts", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) return setMessage(body.error || "Kaydedilemedi");
    const next = await fetch("/api/accounts", { cache: "no-store" }).then((item) => item.json() as Promise<Account[]>);
    setAccounts(next);
    const saved = next.find((item) => item.id === body.id) || next[0];
    if (saved) select(saved);
    setMessage("Hesap kaydedildi.");
  }

  async function remove() {
    if (!draft.id || !window.confirm("Bu hesabı ve bağlı draft/job kayıtlarını silmek istiyor musun?")) return;
    setPending(true);
    const response = await fetch(`/api/accounts/${draft.id}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) return setMessage("Hesap silinemedi.");
    const next = await fetch("/api/accounts", { cache: "no-store" }).then((item) => item.json() as Promise<Account[]>);
    setAccounts(next);
    setDraft(next[0] ? { ...next[0] } : blankAccount());
    setMessage("Hesap silindi.");
  }

  async function testConnection() {
    setPending(true);
    const response = await fetch(`/api/accounts/${draft.id || 0}/test`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(body.ok ? "x-use bağlantısı hazır." : body.capability?.reason || "x-use bağlantısı hazır değil.");
  }

  async function xuseHealth() {
    if (!draft.id) return setMessage("Önce hesabı kaydet.");
    setPending(true);
    const response = await fetch(`/api/accounts/${draft.id}/xuse/health`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? `x-use health: cookie ${body.health?.cookies?.valid ? "geçerli" : "geçersiz"}, queue pending ${body.health?.queue?.pending || 0}.` : body.error || "x-use health alınamadı.");
  }


  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Hesap listesi</CardTitle>
            <CardDescription>Yayın ve stil bağlamı burada tutulur.</CardDescription>
          </div>
          <Button size="icon" variant="outline" onClick={() => setDraft(blankAccount())} aria-label="Yeni hesap">
            <Plus aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {accounts.length === 0 && (
            <Empty className="border border-dashed py-8">
              <EmptyHeader>
                <EmptyTitle>Henüz hesap yok</EmptyTitle>
                <EmptyDescription>Sağdaki formdan ilk hesabı ekle.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => setDraft(blankAccount())}>
                  <Plus data-icon="inline-start" aria-hidden="true" /> Yeni hesap
                </Button>
              </EmptyContent>
            </Empty>
          )}
          {accounts.map((account) => {
            const selected = draft.id === account.id;
            return (
              <Button
                key={account.id}
                type="button"
                variant={selected ? "secondary" : "ghost"}
                className="h-auto min-h-14 justify-start gap-3 border border-transparent p-3 text-left data-[selected=true]:border-primary"
                data-selected={selected}
                onClick={() => select(account)}
              >
                <Avatar size="default">
                  <AvatarFallback>
                    <UserRound aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span className="flex w-full items-center gap-1 truncate text-sm font-medium">@{account.handle}{account.publicVerificationStatus && account.publicVerificationStatus !== "not_verified" && account.publicVerificationStatus !== "unknown" ? <BadgeCheck className={verificationClass(account.publicVerificationStatus)} aria-label={verificationLabel(account.publicVerificationStatus)} /> : null}</span>
                  <span className="w-full truncate text-xs text-muted-foreground">{account.displayName || account.accountKey}</span>
                  {Array.isArray(account.styleProfile.categories) && account.styleProfile.categories.length ? <span className="w-full truncate text-xs text-muted-foreground">{account.styleProfile.categories.map(String).join(" · ")}</span> : null}
                </span>
                {account.defaultAccount && <Badge variant="secondary">default</Badge>}
                <Badge variant={account.enabled ? "default" : "outline"}>{account.enabled ? "aktif" : "pasif"}</Badge>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Hesap düzenle" : "Yeni hesap"}</CardTitle>
          <CardDescription>x-use account id yalnızca bağlantı eşlemesidir; cookie/token bu formda tutulmaz.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="account-key">Account key</FieldLabel>
                <Input id="account-key" value={draft.accountKey} onChange={(event) => setValue("accountKey", event.target.value)} placeholder="haber-merkez" />
              </Field>
              <Field>
                <FieldLabel htmlFor="handle">X handle</FieldLabel>
                <Input id="handle" value={draft.handle} onChange={(event) => setValue("handle", event.target.value.replace(/^@/, ""))} placeholder="ispatla" />
              </Field>
              <Field>
                <FieldLabel htmlFor="display-name">Görünen ad</FieldLabel>
                <Input id="display-name" value={draft.displayName} onChange={(event) => setValue("displayName", event.target.value)} placeholder="Ispatla Haber" />
              </Field>
              <Field>
                <FieldLabel htmlFor="xuse-id">x-use account id</FieldLabel>
                <FieldDescription>Yalnızca x-use hesabıyla eşleşir; secret değildir.</FieldDescription>
                <Input id="xuse-id" value={draft.xuseAccountId} onChange={(event) => setValue("xuseAccountId", event.target.value)} placeholder="x-use içindeki id" />
              </Field>
              <Field>
                <FieldLabel htmlFor="daily-limit">Günlük yayın limiti</FieldLabel>
                <Input id="daily-limit" type="number" min={1} max={100} value={draft.dailyLimit} onChange={(event) => setValue("dailyLimit", Number(event.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="automation-mode">Otomasyon modu</FieldLabel>
                <Select value={draft.automationMode} onValueChange={(value) => setValue("automationMode", value as AccountDraft["automationMode"])}>
                  <SelectTrigger id="automation-mode" className="w-full" aria-label="Otomasyon modu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manuel / onaylı</SelectItem>
                    <SelectItem value="auto">Otomatik</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>

          <Separator />

          <FieldGroup>
            <Field><FieldLabel>x-use hesap sağlığı</FieldLabel><FieldDescription>Cookie/config, warm session ve x-use queue derinliği okunur; cookie veya yerel yol gösterilmez.</FieldDescription></Field>
            <Button type="button" variant="outline" className="w-fit" disabled={pending || !draft.id || !draft.enabled || !draft.xuseAccountId.trim()} onClick={xuseHealth}>{pending ? <Spinner data-icon="inline-start" /> : <FlaskConical data-icon="inline-start" aria-hidden="true" />} Health yenile</Button>
          </FieldGroup>

          <Separator />

          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="account-enabled">Hesap aktif</FieldLabel>
                <FieldDescription>Bu hesap intake ve yayın akışlarında kullanılabilir.</FieldDescription>
              </FieldContent>
              <Switch id="account-enabled" checked={draft.enabled} onCheckedChange={(value) => setValue("enabled", value)} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="default-account">Varsayılan hesap</FieldLabel>
                <FieldDescription>Market ve draft ekranlarında ilk seçilecek hesap.</FieldDescription>
              </FieldContent>
              <Switch id="default-account" checked={draft.defaultAccount} onCheckedChange={(value) => setValue("defaultAccount", value)} />
            </Field>
          </FieldGroup>

          <Separator />

          <FieldGroup>
            <Field>
              <FieldLabel>X subscription geçmişi</FieldLabel>
            <FieldDescription>Kurulu x-use sürümü subscription geçmişi sunmuyor. Mevcut eski kayıtlar yalnız okunur; otomasyon bunlardan tier çıkarsamaz.</FieldDescription>
            </Field>
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
              <Badge variant="outline">{tierLabel(draft.subscriptionState.tier)}</Badge>
              <span className="text-muted-foreground">son x-use gözlemi: {dateTime(draft.subscriptionState.observedAt)}</span>
              {draft.subscriptionState.historyComplete ? <Badge variant="secondary">X geçmişi tamam</Badge> : null}
            </div>
            {draft.subscriptionHistory.length ? <div className="flex flex-col gap-2 text-sm">{draft.subscriptionHistory.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"><span>{tierLabel(event.tier)}</span><span className="text-muted-foreground">{dateTime(event.effectiveAt)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">X tarihli subscription geçmişi döndürmedi.</p>}
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="style-notes">Stil notu</FieldLabel>
            <Input id="style-notes" value={String(draft.styleProfile.tone || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, tone: event.target.value })} placeholder="sade, kanıt odaklı, kısa" />
          </Field>
          <Field>
            <FieldLabel htmlFor="account-niche">Hesap nişi</FieldLabel>
            <FieldDescription>Bu yayın hesabının konusu; her hesap ayrı niş kullanır.</FieldDescription>
            <Input id="account-niche" value={String(draft.styleProfile.niche || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, niche: event.target.value })} placeholder="ör. teknoloji ve girişimcilik" />
          </Field>
          <Field>
            <FieldLabel htmlFor="account-categories">Hesap kategorileri</FieldLabel>
            <FieldDescription>Katalogdan bir veya daha fazla kategori seç. Otomatik yayın yalnız eşleşen hesaplara yönlendirilir.</FieldDescription>
            <select id="account-categories" multiple value={(Array.isArray(draft.styleProfile.categories) ? draft.styleProfile.categories.map(String) : []).filter((value) => categories.some((category) => category.slug === value))} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, categories: Array.from(event.currentTarget.selectedOptions).map((option) => option.value).slice(0, 12) })} className="min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm">
              {categories.filter((category) => category.enabled).map((category) => <option key={category.id} value={category.slug}>{category.name} ({category.slug})</option>)}
            </select>
          </Field>
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="account-ideology">Editoryal eksen / tandans</FieldLabel>
                <FieldDescription>Açık tandanslı kaynak yalnız aynı eksen veya etiketli hesapla eşleşir; eşleşme yoksa otomatik yayın yapılmaz. Boş hesap sadece tandansı belirsiz kaynak içindir.</FieldDescription>
                <Select value={String(draft.styleProfile.ideology || "belirsiz")} onValueChange={(value) => setValue("styleProfile", { ...draft.styleProfile, ideology: value || "belirsiz" })}>
                  <SelectTrigger id="account-ideology" className="w-full" aria-label="Hesap ideolojisi"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="belirsiz">Belirsiz</SelectItem>{ideologies.map((ideology) => <SelectItem key={ideology.id} value={ideology.id}>{ideology.name.tr || ideology.name.en}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="account-opening">Giriş biçimi</FieldLabel>
                <Input id="account-opening" value={String(draft.styleProfile.opening || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, opening: event.target.value })} placeholder="Emoji ile başla / doğrudan başlık / soru" />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-emoji">Emoji kuralı</FieldLabel>
                <Input id="account-emoji" value={String(draft.styleProfile.emoji || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, emoji: event.target.value })} placeholder="⚡️ yalnız son dakika; yoksa kullanma" />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-attribution">Kaynak atfı</FieldLabel>
            <Input id="account-attribution" value={String(draft.styleProfile.attribution || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, attribution: event.target.value })} placeholder="Gerçek kaynak varsa sonda (Kurum adı); yoksa yazma" />
              </Field>
              <Field>
                <FieldLabel htmlFor="account-format">Cümle ve format kuralı</FieldLabel>
                <Input id="account-format" value={String(draft.styleProfile.formatRule || "")} onChange={(event) => setValue("styleProfile", { ...draft.styleProfile, formatRule: event.target.value })} placeholder="tek paragraf, kısa cümle, hashtag yok" />
              </Field>
            </div>
          </FieldGroup>

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" aria-hidden="true" />} Kaydet
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <FlaskConical data-icon="inline-start" aria-hidden="true" />} x-use test
            </Button>
            {draft.id && (
              <Button variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" aria-hidden="true" />} Sil
              </Button>
            )}
            {draft.id && (
              <Badge variant="outline" className="gap-1">
                <Check aria-hidden="true" /> düzenlenebilir
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
