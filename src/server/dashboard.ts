import { getSummary, type DashboardSummary } from "./db";
import { aiConfigured, getAiSettings } from "./ai";
import { automationEnabled, xuseCapability } from "./pipeline";
import { loadSources } from "./sources";
import { secretOrEnv } from "./vault";

export function getDashboardSummary(): DashboardSummary {
  const xuse = xuseCapability();
  const ai = getAiSettings();
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    ...getSummary(loadSources().length),
    automationEnabled: automationEnabled(),
    openaiConfigured: Boolean(secretOrEnv("openai_api_key", "OPENAI_API_KEY")),
    aiConfigured: aiConfigured(ai),
    aiProvider: ai.provider,
    xuseAvailable: xuse.available,
    xuseBin: xuse.bin,
  };
}
