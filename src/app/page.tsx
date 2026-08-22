import { Dashboard } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  return <AppShell><Dashboard initial={getDashboardSummary()} /></AppShell>;
}
