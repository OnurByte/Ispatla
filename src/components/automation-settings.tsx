"use client";

import { useState } from "react";
import { Bot, CircleStop, Play, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

type State = { paused: boolean; xuse: { available: boolean; bin: string; doctor: string; actions: Record<string, boolean>; reason?: string } };

export function AutomationSettings({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    setPending(true);
    setState(await fetch("/api/settings/automation", { cache: "no-store" }).then((response) => response.json() as Promise<State>));
    setPending(false);
  }

  async function setPaused(paused: boolean) {
    setPending(true);
    const response = await fetch("/api/settings/automation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paused }) });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Otomasyon ${paused ? "durduruldu" : "devam ediyor"}.` : body.error || "Ayar değişmedi.");
    await load();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bot aria-hidden="true" />
            <div>
              <CardTitle>Global kill switch</CardTitle>
              <CardDescription>Scheduler ve yeni automation akışını tek dokunuşla durdur.</CardDescription>
            </div>
          </div>
          <Badge variant={state.paused ? "destructive" : "default"}>{state.paused ? "paused" : "running"}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setPaused(false)} disabled={!state.paused || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" aria-hidden="true" />} Devam ettir
          </Button>
          <Button variant="destructive" onClick={() => setPaused(true)} disabled={state.paused || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <CircleStop data-icon="inline-start" aria-hidden="true" />} Durdur
          </Button>
          <Button variant="outline" onClick={load} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />} Yenile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>x-use capability</CardTitle>
          <CardDescription>{state.xuse.bin} · doctor sonucu gerçek runtime’dan okunur.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={state.xuse.available ? "default" : "destructive"}>{state.xuse.available ? "CLI hazır" : "CLI yok"}</Badge>
            <Badge variant={state.xuse.doctor === "ok" ? "default" : state.xuse.doctor === "unavailable" ? "outline" : "destructive"}>doctor: {state.xuse.doctor}</Badge>
          </div>
          <Separator />
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(state.xuse.actions).map(([action, enabled]) => (
              <div key={action} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{action}</span>
                <Badge variant={enabled ? "secondary" : "outline"}>{enabled ? "detected" : "—"}</Badge>
              </div>
            ))}
          </div>
          {state.xuse.reason && <Alert variant="destructive"><AlertDescription>{state.xuse.reason}</AlertDescription></Alert>}
        </CardContent>
      </Card>

      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
    </div>
  );
}
