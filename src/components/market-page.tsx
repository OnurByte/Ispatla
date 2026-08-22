"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BrainCircuit, FilePenLine, RefreshCw, Sparkles } from "lucide-react";
import type { Account, MarketItem } from "@/server/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function scoreVariant(score: number): "default" | "secondary" | "outline" {
  return score >= 80 ? "default" : score >= 70 ? "secondary" : "outline";
}

function stateLabel(item: MarketItem) {
  if (item.scoreEvidence.kind === "heuristic") return "AI doğrulaması bekliyor";
  if (item.marketStatus === "drafted") return "Draft üretildi";
  if (item.marketStatus === "queued") return "Reconciliation bekliyor";
  return "Yayın adayı";
}

function OpportunityCard({ item, accountId, pending, onGenerate }: { item: MarketItem; accountId: number; pending: string; onGenerate: (externalId: string) => void }) {
  const modelLabel = item.scoreEvidence.model || "heuristic";
  return (
    <Card size="sm" className="transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">FIRSAT</Badge>
            <a href={item.statusUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-foreground hover:underline">@{item.sourceHandle}<ArrowUpRight className="size-3" aria-hidden="true" /></a>
            <span>·</span><span>{stateLabel(item)}</span>
          </div>
          <CardTitle className="text-[15px] leading-6 tracking-tight"><a href={item.statusUrl} target="_blank" rel="noreferrer" className="line-clamp-4 hover:underline">{item.text}</a></CardTitle>
        </div>
        <CardAction className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={scoreVariant(item.score)} className="text-base tabular-nums">{Math.round(item.score)}</Badge>
          <span className="text-[11px] text-muted-foreground">fırsat skoru</span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 divide-x rounded-lg border bg-muted/20 sm:grid-cols-4">
          <div className="px-3 py-2"><div className="text-[11px] text-muted-foreground">Tazelik</div><div className="font-medium tabular-nums">{item.freshness}</div></div>
          <div className="px-3 py-2"><div className="text-[11px] text-muted-foreground">Hız</div><div className="font-medium tabular-nums">{item.velocity}</div></div>
          <div className="px-3 py-2"><div className="text-[11px] text-muted-foreground">AI / güven</div><div className="font-medium tabular-nums">{item.scoreEvidence.ai || "—"} / {item.scoreEvidence.confidence || 0}%</div></div>
          <div className="px-3 py-2"><div className="text-[11px] text-muted-foreground">Risk</div><div className={item.risk > 50 ? "font-medium text-destructive" : "font-medium tabular-nums"}>{item.risk}</div></div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 truncate text-xs text-muted-foreground" title={item.scoreEvidence.reason || modelLabel}>
            <span className="font-medium text-foreground">{modelLabel}</span>{item.scoreEvidence.reason ? <span> · {item.scoreEvidence.reason}</span> : null}
          </div>
          <Button size="sm" onClick={() => onGenerate(item.externalId)} disabled={Boolean(pending) || !accountId}>
            {pending === item.externalId ? <Spinner data-icon="inline-start" /> : <Sparkles data-icon="inline-start" aria-hidden="true" />}
            {pending === item.externalId ? "Üretiliyor" : accountId ? "Bu fırsattan draft" : "Önce hesap ekle"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketPage({ initial, accounts }: { initial: MarketItem[]; accounts: Account[] }) {
  const [items, setItems] = useState(initial);
  const [accountId, setAccountId] = useState(accounts.find((account) => account.defaultAccount && account.enabled)?.id || accounts.find((account) => account.enabled)?.id || 0);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "waiting">("all");

  async function reload() {
    const response = await fetch("/api/market", { cache: "no-store" });
    if (response.ok) setItems(await response.json() as MarketItem[]);
  }

  async function generate(externalId: string) {
    setPending(externalId);
    const response = await fetch("/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ externalId, accountId: accountId || null, format: "post" }),
    });
    const body = await response.json().catch(() => ({}));
    setPending("");
    setMessage(response.ok ? "Draft stüdyoya gönderildi." : body.error || "Draft üretilemedi.");
    if (response.ok) await reload();
  }

  const visible = useMemo(() => items.filter((item) => filter === "ready" ? item.scoreEvidence.kind === "hybrid" : filter === "waiting" ? item.scoreEvidence.kind === "heuristic" : true), [filter, items]);
  const waiting = items.filter((item) => item.scoreEvidence.kind === "heuristic").length;
  const ready = items.length - waiting;

  return (
    <div className="flex flex-col gap-5">
      <Alert>
        <BrainCircuit aria-hidden="true" />
        <AlertDescription>Fırsat = skor ≥ 70, sensitive olmayan ve henüz confirmed/pending olmayan kaynak postu. Heuristic kayıt AI doğrulamasını bekler; bu, X&apos;in iç sıralama skoru veya erişim garantisi değildir.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Fırsat akışı <span className="text-muted-foreground">· {items.length}</span></CardTitle>
            <CardDescription>Kaynak → tazelik/hız → AI görüşü → hesap stiline göre draft.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={accountId ? String(accountId) : null} onValueChange={(value) => setAccountId(value ? Number(value) : 0)}>
              <SelectTrigger className="w-[190px]" aria-label="Draft hesabı"><SelectValue placeholder="Draft hesabı" /></SelectTrigger>
              <SelectContent><SelectGroup>{accounts.filter((account) => account.enabled).map((account) => <SelectItem key={account.id} value={String(account.id)}>@{account.handle}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Button variant="outline" onClick={reload}><RefreshCw data-icon="inline-start" aria-hidden="true" /> Yenile</Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!accountId && <Alert><AlertDescription className="flex flex-wrap items-center justify-between gap-3"><span>Fırsattan draft üretmek için önce bir yayın hesabı eşle.</span><Link href="/accounts" className={buttonVariants({ variant: "outline", size: "sm" })}>Hesap ekle</Link></AlertDescription></Alert>}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button type="button" variant={filter === "all" ? "secondary" : "outline"} onClick={() => setFilter("all")} className="h-auto min-h-20 flex-col items-start justify-center p-3 text-left" aria-pressed={filter === "all"}><span className="text-xs text-muted-foreground">Tüm fırsatlar</span><span className="text-2xl font-semibold tabular-nums">{items.length}</span></Button>
            <Button type="button" variant={filter === "ready" ? "secondary" : "outline"} onClick={() => setFilter("ready")} className="h-auto min-h-20 flex-col items-start justify-center p-3 text-left" aria-pressed={filter === "ready"}><span className="text-xs text-muted-foreground">AI doğrulanmış</span><span className="text-2xl font-semibold tabular-nums">{ready}</span></Button>
            <Button type="button" variant={filter === "waiting" ? "secondary" : "outline"} onClick={() => setFilter("waiting")} className="h-auto min-h-20 flex-col items-start justify-center p-3 text-left" aria-pressed={filter === "waiting"}><span className="text-xs text-muted-foreground">AI bekleyen</span><span className="text-2xl font-semibold tabular-nums">{waiting}</span></Button>
          </div>

          {visible.length === 0 ? (
            <Empty className="border border-dashed py-12">
              <EmptyHeader><EmptyTitle>{items.length ? "Bu filtrede fırsat yok" : "Henüz fırsat yok"}</EmptyTitle><EmptyDescription>{items.length ? "Diğer görünümü seç veya yeni scan çalıştır." : "Kaynakları tara; skorlanan, sensitive olmayan postlar burada açıkça listelenecek."}</EmptyDescription></EmptyHeader>
              <EmptyContent><Button variant="outline" onClick={reload}><RefreshCw data-icon="inline-start" aria-hidden="true" /> Yenile</Button></EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-3">{visible.map((item) => <OpportunityCard key={item.externalId} item={item} accountId={accountId} pending={pending} onGenerate={generate} />)}</div>
          )}
        </CardContent>
      </Card>

      {message && <Alert><FilePenLine aria-hidden="true" /><AlertDescription>{message}</AlertDescription></Alert>}
    </div>
  );
}
