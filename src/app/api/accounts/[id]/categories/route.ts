import { NextResponse } from "next/server";
import { getAccountCategoryConfigs, saveAccountCategoryConfig } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const accountId = Number((await context.params).id);
  return NextResponse.json(getAccountCategoryConfigs(accountId));
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const accountId = Number((await context.params).id);
  try {
    const body = await readJsonBody(request);
    const categoryId = Number(body.categoryId);
    return NextResponse.json(saveAccountCategoryConfig({
      accountId,
      categoryId,
      enabled: body.enabled !== false,
      primary: body.primary === true,
      weight: Number(body.weight ?? 1),
      priority: Number(body.priority ?? 0),
      publishThreshold: body.publishThreshold === null || body.publishThreshold === undefined ? null : Number(body.publishThreshold),
      dailyBudget: body.dailyBudget === null || body.dailyBudget === undefined ? null : Number(body.dailyBudget),
      styleOverride: object(body.styleOverride),
      aiRouteOverride: object(body.aiRouteOverride),
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "account category kaydedilemedi" }, { status: 400 });
  }
}
