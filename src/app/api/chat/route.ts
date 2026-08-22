import { NextResponse } from "next/server";
import { getChatActions, getChatMessages, getChatSession } from "@/server/db";
import { handleChatMessage } from "@/server/chat";
import { guardMutation, readJsonBody } from "@/server/api-guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") || "";
  const session = getChatSession(sessionId);
  if (!session) return NextResponse.json({ error: "chat session bulunamadı" }, { status: 404 });
  return NextResponse.json({ session, messages: getChatMessages(session.id), actions: getChatActions(session.id) });
}

export async function POST(request: Request) {
  const denied = guardMutation(request);
  if (denied) return denied;
  try {
    const body = await readJsonBody(request);
    return NextResponse.json(await handleChatMessage({ sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined, message: String(body.message || "") }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "chat çalışmadı" }, { status: 422 });
  }
}
