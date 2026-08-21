import { Dashboard } from "@/components/dashboard";
import { getDashboardSummary } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Dashboard initial={getDashboardSummary()} />;
}
