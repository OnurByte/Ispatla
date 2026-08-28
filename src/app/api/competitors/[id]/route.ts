import { NextResponse } from "next/server";
import { deleteCompetitor, getCompetitors, saveCompetitor } from "@/server/db";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  const current = getCompetitors().find((competitor) => competitor.id === id);
  if (!current) return NextResponse.json({ error: "rakip bulunamadı" }, { status: 404 });
  try {
    const body = await readJsonBody(request);
    return NextResponse.json(saveCompetitor({
      handle: String(body.handle ?? current.handle),
      name: String(body.name ?? current.name).slice(0, 120),
      category: String(body.category ?? current.category).slice(0, 240),
      enabled: body.enabled === undefined ? current.enabled : body.enabled === true,
      now: Math.floor(Date.now() / 1000),
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "rakip güncellenemedi" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  const id = Number((await context.params).id);
  if (!getCompetitors().some((competitor) => competitor.id === id)) return NextResponse.json({ error: "rakip bulunamadı" }, { status: 404 });
  deleteCompetitor(id);
  return NextResponse.json({ ok: true });
}
