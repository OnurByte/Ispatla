import { getSummary, type DashboardSummary } from "./db";
import { automationEnabled, xuseCapability } from "./pipeline";
import { loadSources } from "./sources";

export function getDashboardSummary(): DashboardSummary {
  const xuse = xuseCapability();
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    ...getSummary(loadSources().length),
    automationEnabled: automationEnabled(),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    xuseAvailable: xuse.available,
    xuseBin: xuse.bin,
  };
}
