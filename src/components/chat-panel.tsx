"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Send, TerminalSquare } from "lucide-react";
import type { ChatAction, ChatMessage, ChatSession } from "@/server/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type ChatResponse = { session: ChatSession; messages: ChatMessage[]; actions: ChatAction[] };

export function ChatDesk() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/chat/sessions", { cache: "no-store" })
      .then((response) => response.json() as Promise<ChatSession[]>)
      .then(async (sessions) => {
        const last = sessions[0];
        if (!last) return;
        const response = await fetch(`/api/chat?sessionId=${encodeURIComponent(last.id)}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const body = await response.json() as ChatResponse;
        if (!cancelled) {
          setSession(body.session);
          setMessages(body.messages);
          setActions(body.actions);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = value.trim();
    if (!message || pending) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: session?.id, message }),
    });
    const body = await response.json().catch(() => ({})) as ChatResponse & { error?: string };
    setPending(false);
    if (!response.ok) return setError(body.error || "Chat çalışmadı.");
    setSession(body.session);
    setMessages(body.messages);
    setActions((current) => [...current.filter((item) => !body.actions.some((next) => next.id === item.id)), ...body.actions]);
    setValue("");
  }

  async function confirm(action: ChatAction) {
    setPending(true);
    setError("");
    const response = await fetch(`/api/chat/actions/${action.id}`, { method: "POST" });
    const body = await response.json().catch(() => ({})) as { action?: ChatAction; message?: ChatMessage; error?: string };
    setPending(false);
    if (!response.ok || !body.action || !body.message) return setError(body.error || "Onay uygulanamadı.");
    setActions((current) => current.map((item) => item.id === body.action!.id ? body.action! : item));
    setMessages((current) => [...current, body.message!]);
  }

  const pendingAction = [...actions].reverse().find((action) => action.status === "pending_confirmation");

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div><h2 className="font-semibold">Ispatla sohbet</h2><p className="mt-1 text-sm text-muted-foreground">Üret, kuyruğu gör ve gönderim onayını burada ver. AI yalnız intent önerir.</p></div>
        <Badge variant="outline">local</Badge>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-5 py-5">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"><TerminalSquare className="mb-2 size-4" />`/generate`, `/post`, `/queue`, `/send`, `/cancel`, `/accounts`, `/status`</div>}
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-8 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-8 rounded-xl border bg-muted/30 px-3 py-2 text-sm"}>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] opacity-70">{message.role === "user" ? "Sen" : "Ispatla"}</div>
                <p className="whitespace-pre-wrap leading-5">{message.content}</p>
              </div>
            ))}
          </div>
      </ScrollArea>
      <div className="border-t p-5">
          {pendingAction && (
            <Alert className="mb-3">
              <AlertDescription className="flex items-center justify-between gap-3"><span>Bu işlem gerçek queue/x-use değişikliği yapacak.</span><Button size="sm" onClick={() => confirm(pendingAction)} disabled={pending}><Check data-icon="inline-start" aria-hidden="true" /> Onayla</Button></AlertDescription>
            </Alert>
          )}
          {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
          <form className="flex items-end gap-2" onSubmit={send}>
            <Textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder="Bir komut yaz…" className="min-h-14 resize-none" aria-label="Chat mesajı" />
            <Button type="submit" size="icon" disabled={pending || !value.trim()} aria-label="Gönder">{pending ? <Spinner /> : <Send aria-hidden="true" />}</Button>
          </form>
      </div>
    </div>
  );
}
