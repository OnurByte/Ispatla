import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { XInspectorPage } from "@/components/x-inspector-page";
export const dynamic = "force-dynamic";
export default function XRoute() { return <AppShell><main className="min-h-screen"><div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"><PageHeading eyebrow="Operasyon / bağlı hesaplar" title="X İnceleme" description="Bağlı x-use hesaplarının son postlarını ve hedef bazlı etkileşim işlerini yönet." /><XInspectorPage /></div></main></AppShell>; }
