"use client";

import { useState } from "react";
import type { Account } from "@/server/db";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export function StyleProfilesPage({ initial }: { initial: Account[] }) {
  const [accounts, setAccounts] = useState(initial);
  const [selected, setSelected] = useState(initial[0]?.id || 0);
  const current = accounts.find((account) => account.id === selected);
  const [text, setText] = useState(current ? JSON.stringify(current.styleProfile, null, 2) : "{}");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function choose(id: number) {
    const account = accounts.find((item) => item.id === id);
    setSelected(id);
    setText(account ? JSON.stringify(account.styleProfile, null, 2) : "{}");
    setMessage("");
  }

  async function save() {
    if (!current) return;
    let styleProfile: Record<string, unknown>;
    try {
      styleProfile = JSON.parse(text) as Record<string, unknown>;
    } catch {
      setMessage("Geçerli JSON gerekli.");
      return;
    }
    setPending(true);
    const response = await fetch(`/api/accounts/${current.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ styleProfile }) });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "Stil profili kaydedildi." : body.error || "Kaydedilemedi.");
    if (response.ok) setAccounts((items) => items.map((item) => item.id === current.id ? body : item));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Hesaplar</CardTitle>
          <CardDescription>Stil bağlamı hesapla birlikte yaşar.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {accounts.length === 0 ? (
            <Empty className="border border-dashed py-8">
              <EmptyHeader>
                <EmptyTitle>Hesap yok</EmptyTitle>
                <EmptyDescription>Stil profili oluşturmak için önce bir hesap ekle.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            accounts.map((account) => (
              <Button
                type="button"
                key={account.id}
                variant={selected === account.id ? "secondary" : "ghost"}
                className="h-auto justify-start border border-transparent p-3 text-left"
                data-selected={selected === account.id}
                onClick={() => choose(account.id)}
              >
                @{account.handle}
              </Button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{current ? `@${current.handle} stil profili` : "Stil profili"}</CardTitle>
          <CardDescription>JSON olarak ton, dil, cümle uzunluğu, yasaklı kalıp ve örnekleri saklayabilirsin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="style-profile">Profile JSON</FieldLabel>
            <FieldDescription>Üretim sırasında hesap style context’i olarak okunur.</FieldDescription>
            <Textarea id="style-profile" className="min-h-72 font-mono text-xs" value={text} onChange={(event) => setText(event.target.value)} disabled={!current || pending} aria-invalid={message === "Geçerli JSON gerekli."} />
          </Field>
          {message && <Alert variant={message === "Geçerli JSON gerekli." ? "destructive" : "default"}><AlertDescription>{message}</AlertDescription></Alert>}
          <Button onClick={save} disabled={!current || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null} Stil profilini kaydet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
