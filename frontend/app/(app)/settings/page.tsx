"use client";

import { useId, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/lib/auth";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function SettingsPage() {
  const currentId = useId();
  const nextId = useId();
  const [current, setCurrent] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null); setErr(null);
    try {
      await changePassword({ current_password: current, new_password: nextPw });
      setOk("Password changed");
      setCurrent(""); setNextPw("");
    } catch (e) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : "Failed to change password";
      setErr(msg);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Einstellungen</h1>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 space-y-4 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Einstellungen</h2>
        <Card>
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>Aktualisiere dein Passwort</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor={currentId}>Aktuelles Passwort</Label>
              <Input id={currentId} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={nextId}>Neues Passwort</Label>
              <Input id={nextId} type="password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit">Speichern</Button>
              {ok && <span className="text-green-600 text-sm">{ok}</span>}
              {err && <span className="text-destructive text-sm">{err}</span>}
            </div>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
