import { AppShell } from "@/components/app-shell";
import { AccountsPage } from "@/components/accounts-page";
import { PageHeading } from "@/components/page-heading";
import { getAccounts } from "@/server/db";

export const dynamic = "force-dynamic";

export default function AccountsRoute() {
  return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Operasyon / hesaplar" title="Hesap listesi ve hesap edit" description="Hangi hesap konuşuyor, hangi stil profiliyle çalışıyor ve hangi otomasyon sınırlarına sahip burada görürsün." /><AccountsPage initial={getAccounts()} /></div></main></AppShell>;
}
