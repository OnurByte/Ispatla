import { Activity, Bot, CheckCircle2, Eye, FileText, OctagonAlert, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CompetitorsPanel } from "@/components/competitors-panel";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAiSettings, isAiEnabled } from "@/server/ai";
import { getAnalytics } from "@/server/db";
import { getDashboardSummary as dashboard } from "@/server/dashboard";

export const dynamic = "force-dynamic";

function formatUsd(value: number): string {
  return `$${value.toFixed(3)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("tr-TR");
}

function formatRate(value: number): string {
  return `%${(value * 100).toFixed(2)}`;
}

export default function AnalyticsRoute() {
  const analytics = getAnalytics();
  const summary = dashboard();
  const ai = getAiSettings();
  const aiEnabled = isAiEnabled();
  const aiUsage = analytics.aiUsage;
  const cards = [
    [Users, "Toplam takipçi", formatNumber(analytics.totalFollowers), "Hesap bazlı toplam; tekil kitle değildir"],
    [Eye, "Toplam görüntülenme", formatNumber(analytics.accountPerformance.reduce((sum, account) => sum + account.metrics.views, 0)), "Confirmed yayınların en son public snapshot’ı"],
    [CheckCircle2, "Confirmed", analytics.confirmed, "Yazar ve metin reconciliation kanıtlı"],
    [OctagonAlert, "Bloklanan", analytics.blocked + analytics.failed, `${analytics.blocked} blocked · ${analytics.failed} failed`],
  ] as const;

  return (
    <AppShell>
      <main className="min-h-screen">
        <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <PageHeading eyebrow="Ölçüm / feedback" title="Analytics ve feedback" description="Fırsat skoru ile yayın sonucu arasındaki farkı, pipeline’ın nerede durduğunu ve neyin kanıtlandığını izle." />

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Analytics özeti">
            {cards.map(([Icon, label, value, detail]) => (
              <Card key={label}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardDescription>{label}</CardDescription>
                    <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
                  </div>
                  <Icon aria-hidden="true" />
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>AI kullanımı</CardTitle>
                <CardDescription>Bu ayki yerel kullanım ledger’ı; fiyat gerçek fatura değil, uygulama tahminidir.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Bot aria-hidden="true" />
                <Badge variant={!aiEnabled ? "secondary" : summary.aiConfigured ? "default" : "destructive"}>{!aiEnabled ? "kapalı" : summary.aiConfigured ? "hazır" : "yapılandırılmamış"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">AI çağrısı</div><div className="text-2xl font-semibold tabular-nums">{aiUsage.events}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Kredi birimi</div><div className="text-2xl font-semibold tabular-nums">{aiUsage.units}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Yerel tahmin</div><div className="text-2xl font-semibold tabular-nums">{formatUsd(aiUsage.estimatedUsd)}</div><div className="text-xs text-muted-foreground">{aiUsage.monthlyBudgetUsd > 0 ? `bütçe ${formatUsd(aiUsage.monthlyBudgetUsd)}` : "bütçe sınırı yok"}</div></div>
              </div>
              <div className="flex flex-wrap gap-2"><Badge variant="outline">seçili: {ai.provider}:{ai.model}</Badge><Badge variant="outline">dönem: bu ay</Badge></div>
              <Separator />
              {aiUsage.byKind.length ? (
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">Kullanım kırılımı</div>
                  {aiUsage.byKind.map((item) => <div key={item.kind} className="flex items-center justify-between gap-4 text-sm"><span className="truncate">{item.kind.replaceAll(":", " / ")}</span><span className="shrink-0 tabular-nums text-muted-foreground">{item.events} çağrı · {item.units} kredi · {formatUsd(item.estimatedUsd)}</span></div>)}
                </div>
              ) : <Alert><AlertDescription>Bu ay henüz AI çağrısı kaydedilmedi.</AlertDescription></Alert>}
              {aiUsage.byModel.length ? <div className="flex flex-col gap-2 text-xs text-muted-foreground"><div className="text-sm font-medium text-foreground">Model kırılımı</div>{aiUsage.byModel.map((item) => <div key={`${item.provider}:${item.model}`} className="flex items-center justify-between gap-4"><span className="truncate">{item.provider}:{item.model}</span><span className="shrink-0 tabular-nums">{item.events} çağrı · {item.units} kredi</span></div>)}</div> : null}
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline kanıtı</CardTitle>
                <CardDescription>Dashboard state ile feedback snapshot’ın ayrımı.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4"><span>Gözlenen post</span><Badge variant="secondary">{summary.postsObserved}</Badge></div>
                <div className="flex items-center justify-between gap-4"><span>Fırsatlar</span><Badge variant="secondary">{summary.opportunities}</Badge></div>
                <div className="flex items-center justify-between gap-4"><span>Confirmed yayın</span><Badge variant="default">{summary.publishedConfirmed}</Badge></div>
                <div className="flex items-center justify-between gap-4"><span>Feedback snapshot</span><Badge variant="outline">{analytics.feedback}</Badge></div>
                <Alert>
                  <Activity aria-hidden="true" />
                  <AlertDescription>Local state; canlı X performansı değil.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ölçüm sözleşmesi</CardTitle>
                <CardDescription>Araştırma dokümanları ürün davranışının referansı olarak tutulur.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <a className={buttonVariants({ variant: "ghost", className: "justify-start" })} href="https://github.com/OnurByte/Ispatla/blob/main/x-algorithm-news-account-analysis.md" target="_blank" rel="noreferrer">
                  <FileText data-icon="inline-start" aria-hidden="true" /> X algorithm news account analysis
                </a>
                <a className={buttonVariants({ variant: "ghost", className: "justify-start" })} href="https://github.com/OnurByte/Ispatla/blob/main/xpatla-site-algoritma-arastirmasi-2026-08-21.md" target="_blank" rel="noreferrer">
                  <FileText data-icon="inline-start" aria-hidden="true" /> XPatla site algoritma araştırması
                </a>
                <Alert>
                  <AlertDescription>Score, freshness, velocity ve feedback aynı ürün döngüsünde görünür; X’in kapalı ağırlıkları uydurulmaz.</AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hesap performansı</CardTitle>
              <CardDescription>Public sayaçlar: görüntülenme, like, reply, repost, quote ve varsa anket oyu. Private impression, click, share/DM/copy-link ve dwell verilmez; tahmin de edilmez.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {analytics.accountPerformance.length ? analytics.accountPerformance.map((account) => (
                <div key={account.accountId} className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">@{account.handle}</span><span className="text-muted-foreground">{account.confirmed} confirmed · {account.feedback} snapshot</span></div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div><div className="text-xs text-muted-foreground">Takipçi</div><div className="font-medium tabular-nums">{formatNumber(account.followers)}</div><div className="text-xs text-muted-foreground">24s {account.followerDelta24h === null ? "—" : `${account.followerDelta24h >= 0 ? "+" : ""}${formatNumber(account.followerDelta24h)}`}</div></div>
                    <div><div className="text-xs text-muted-foreground">Görüntülenme</div><div className="font-medium tabular-nums">{formatNumber(account.metrics.views)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Etkileşim</div><div className="font-medium tabular-nums">{formatNumber(account.metrics.engagements)}</div><div className="text-xs text-muted-foreground">{formatRate(account.metrics.engagementRate)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Yanıt</div><div className="font-medium tabular-nums">{formatNumber(account.metrics.replies)}</div><div className="text-xs text-muted-foreground">{formatRate(account.metrics.replyRate)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Repost / quote</div><div className="font-medium tabular-nums">{formatNumber(account.metrics.reposts)} / {formatNumber(account.metrics.quotes)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Profil sayacı</div><div className="font-medium tabular-nums">{formatNumber(account.statuses)} post</div><div className="text-xs text-muted-foreground">{formatNumber(account.following)} takip edilen</div></div>
                  </div>
                </div>
              )) : <Alert><AlertDescription>Hesapla eşleşmiş confirmed yayın ve feedback henüz yok.</AlertDescription></Alert>}
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>En iyi yayınlar</CardTitle><CardDescription>En son public snapshot’a göre görüntülenme öncelikli sıralama.</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-3">
                {analytics.topPosts.length ? analytics.topPosts.map((post) => <div key={post.externalId} className="rounded-lg border p-3 text-sm"><div className="mb-2 flex flex-wrap justify-between gap-2"><span className="font-medium">@{post.accountHandle} · {post.category}</span><Badge variant="secondary">{formatNumber(post.metrics.views)} görüntülenme</Badge></div><p className="line-clamp-2 text-muted-foreground">{post.text || "Metin kaydı yok"}</p><div className="mt-2 text-xs text-muted-foreground">{formatNumber(post.metrics.likes)} like · {formatNumber(post.metrics.replies)} yanıt · {formatNumber(post.metrics.reposts)} repost · {formatNumber(post.metrics.quotes)} quote · {formatRate(post.metrics.engagementRate)}</div></div>) : <Alert><AlertDescription>Yeterli confirmed yayın verisi yok.</AlertDescription></Alert>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Ne çalışıyor?</CardTitle><CardDescription>Öneri için en az 5 confirmed post gerekir; breaking ve güncellik her zaman önceliklidir.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div><div className="mb-2 text-sm font-medium">Kategori</div>{analytics.categoryPerformance.length ? analytics.categoryPerformance.map((item) => <div key={item.category} className="flex justify-between gap-2 border-b py-2 text-xs"><span className="truncate">{item.category}</span><span>{item.posts} post · {formatRate(item.engagementRate)} · {item.status === "insufficient" ? "veri az" : item.status === "above" ? "üstünde" : "altında"}</span></div>) : <p className="text-xs text-muted-foreground">Henüz kategori verisi yok.</p>}</div>
                <div><div className="mb-2 text-sm font-medium">Format</div>{analytics.formatPerformance.length ? analytics.formatPerformance.map((item) => <div key={item.format} className="flex justify-between gap-2 border-b py-2 text-xs"><span className="truncate">{item.format}</span><span>{item.posts} post · {formatRate(item.engagementRate)} · {item.status === "insufficient" ? "veri az" : item.status === "above" ? "üstünde" : "altında"}</span></div>) : <p className="text-xs text-muted-foreground">Henüz format verisi yok.</p>}</div>
                <div><div className="mb-2 text-sm font-medium">Yayın saati</div>{analytics.timePerformance.length ? analytics.timePerformance.map((item) => <div key={item.label} className="flex justify-between gap-2 border-b py-2 text-xs"><span>{item.label}</span><span>{item.posts} post · {formatRate(item.engagementRate)} · {item.status === "insufficient" ? "veri az" : item.status === "above" ? "üstünde" : "altında"}</span></div>) : <p className="text-xs text-muted-foreground">Henüz zaman verisi yok.</p>}</div>
              </CardContent>
            </Card>
          </div>

          <CompetitorsPanel initial={analytics.competitors} />

          {analytics.competitors.length ? <Card><CardHeader><CardTitle>Rakip performansı</CardTitle><CardDescription>Rakipler kaynak değildir; yalnız public ölçüm karşılaştırmasıdır.</CardDescription></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{analytics.competitors.map((competitor) => <div key={competitor.id} className="rounded-lg border p-4"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-medium">@{competitor.handle}</div><div className="text-xs text-muted-foreground">{competitor.category || "kategorisiz"}</div></div><Badge variant="outline">{formatNumber(competitor.followers)} takipçi</Badge></div><div className="mt-3 text-sm">{formatNumber(competitor.metrics.views)} görüntülenme · {formatNumber(competitor.metrics.engagements)} etkileşim · {formatRate(competitor.metrics.engagementRate)}</div><div className="mt-3 flex flex-col gap-2">{competitor.topPosts.slice(0, 3).map((post) => <div key={post.externalId} className="text-xs"><div className="line-clamp-1 text-muted-foreground">{post.text}</div><div>{formatNumber(post.metrics.views)} view · {formatNumber(post.metrics.reposts)} repost · {formatNumber(post.metrics.quotes)} quote</div></div>)}</div></div>)}</CardContent></Card> : null}
        </div>
      </main>
    </AppShell>
  );
}
