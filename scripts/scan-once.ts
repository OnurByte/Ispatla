import { runScheduledAutomationTasks } from "../src/server/automation-scheduler";

try {
  const result = await runScheduledAutomationTasks();
  process.stdout.write(`${JSON.stringify({ status: result.failed ? "failed" : result.partial ? "partial" : "ok", ...result })}\n`);
  if (result.failed || result.partial) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
