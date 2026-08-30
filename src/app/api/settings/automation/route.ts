import { NextResponse } from "next/server";
import { AUTOMATION_TASK_IDS, getAutomationLogs, getAutomationSchedules, getSetting, saveAutomationSchedule, setSetting } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";
import { detectXUse } from "@/server/xuse";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ paused: getSetting("automation_paused", "0") === "1", xuse: detectXUse(), schedules: getAutomationSchedules(), logs: getAutomationLogs(100) });
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }
  if (body.action === "update_schedule") {
    const id = String(body.task || "");
    if (!AUTOMATION_TASK_IDS.includes(id as (typeof AUTOMATION_TASK_IDS)[number])) return NextResponse.json({ error: "bilinmeyen otomasyon görevi" }, { status: 400 });
    try {
      const schedule = saveAutomationSchedule({ id: id as (typeof AUTOMATION_TASK_IDS)[number], enabled: body.enabled !== false, intervalSeconds: Number(body.intervalSeconds), nextRunAt: Number(body.nextRunAt), now: Math.floor(Date.now() / 1000) });
      return NextResponse.json({ schedule, schedules: getAutomationSchedules(), logs: getAutomationLogs(100) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "schedule kaydedilemedi" }, { status: 400 });
    }
  }
  const paused = body.paused === true;
  setSetting("automation_paused", paused ? "1" : "0", Math.floor(Date.now() / 1000));
  return NextResponse.json({ paused });
}
