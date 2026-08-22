import { Activity, CheckCircle2, FileText, OctagonAlert, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalytics } from "@/server/db";
import { getDashboardSummary as dashboard } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsRoute() {
  const analytics = getAnalytics();
  const summary = dashboard();
  const cards = [
    [FileText, "Toplam draft", analytics.drafts, "Üretim ve manuel varyantlar"],
    [Timer, "Kuyruk", analytics.queued, "Çalışan veya reconciliation bekleyen"],
    [CheckCircle2, "Confirmed", analytics.confirmed, "Kanıtı tamamlanan işler"],
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
        </div>
      </main>
    </AppShell>
  );
}
