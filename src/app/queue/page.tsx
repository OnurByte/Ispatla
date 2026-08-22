import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { QueuePage } from "@/components/queue-page";
import { getJobs } from "@/server/db";

export const dynamic = "force-dynamic";

export default function QueueRoute() {
  return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Otomasyon / yürütme" title="Yayın kuyruğu" description="x-use job’larını, retry’ları ve FxTwitter reconciliation kanıtını tek yerde yönet." /><QueuePage initial={getJobs()} /></div></main></AppShell>;
}
