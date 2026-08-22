import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { StyleProfilesPage } from "@/components/style-profiles-page";
import { getAccounts } from "@/server/db";

export const dynamic = "force-dynamic";

export default function StyleRoute() {
  return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[980px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Ayarlar / voice" title="Stil profilleri" description="XPatla’daki style context fikrini hesap bazlı, düzenlenebilir ve üretime bağlı bir profile dönüştür." /><StyleProfilesPage initial={getAccounts()} /></div></main></AppShell>;
}
