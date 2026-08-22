import { NextResponse } from "next/server";
import { executeChatAction } from "@/server/chat";
import { guardMutation } from "@/server/api-guard";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const result = await executeChatAction(Number((await context.params).id));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "chat action çalışmadı" }, { status: 422 });
  }
}
