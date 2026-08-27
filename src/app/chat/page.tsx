import { AppShell } from "@/components/app-shell";
import { ChatDesk } from "@/components/chat-panel";
import { PageHeading } from "@/components/page-heading";

export const dynamic = "force-dynamic";

export default function ChatRoute() {
  return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Üretim / ana çalışma alanı" title="Sohbet" description="Brief ver, taslak üret, kuyruğu incele ve gerçek değişiklikleri yalnız açık onayla uygula." /><ChatDesk /></div></main></AppShell>;
}
