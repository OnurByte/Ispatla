import { NextResponse } from "next/server";
import { getSourceCategoryConfigs, saveSourceCategoryConfig } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const handle = (await context.params).handle.replace(/^@/, "").toLowerCase();
  return NextResponse.json(getSourceCategoryConfigs(handle));
}

export async function PUT(request: Request, context: { params: Promise<{ handle: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    const sourceHandle = (await context.params).handle.replace(/^@/, "").toLowerCase();
    const config = saveSourceCategoryConfig({
      sourceHandle,
      categoryId: Number(body.categoryId),
      monitoringTier: body.monitoringTier === "A" || body.monitoringTier === "B" ? body.monitoringTier : "C",
      discoveryWeight: Number(body.discoveryWeight ?? 1),
      categoryReputation: body.categoryReputation === null || body.categoryReputation === undefined ? null : Number(body.categoryReputation),
      enabled: body.enabled !== false,
      lastEvidenceAt: Number(body.lastEvidenceAt ?? Math.floor(Date.now() / 1000)),
    });
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "source category kaydedilemedi" }, { status: 400 });
  }
}
