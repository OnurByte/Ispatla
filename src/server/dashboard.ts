import { getSummary, type DashboardSummary } from "./db";
import { aiConfigured, getAiSettings, isAiEnabled } from "./ai";
import { automationEnabled, xuseCapability } from "./pipeline";
import { loadSources } from "./sources";
import { secretOrEnv } from "./vault";

export function getDashboardSummary(): DashboardSummary {
  const xuse = xuseCapability();
  const ai = getAiSettings();
  // Next 16 Server→Client props must be JSON-shaped; normalize native SQLite row values at this boundary.
  return JSON.parse(JSON.stringify({
    generatedAt: Math.floor(Date.now() / 1000),
    ...getSummary(loadSources().length),
    automationEnabled: automationEnabled(),
    openaiConfigured: Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY")),
    aiEnabled: isAiEnabled(),
    aiConfigured: aiConfigured(ai),
    aiProvider: ai.provider,
    xuseAvailable: xuse.available,
    xuseBin: xuse.bin,
  })) as DashboardSummary;
}
