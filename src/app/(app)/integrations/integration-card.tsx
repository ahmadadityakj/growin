"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveIntegration, testIntegration } from "./actions";
import type { ProviderKey } from "@/server/services/integration-service";

export function IntegrationCard({
  provider,
  fields,
  existing,
}: {
  provider: ProviderKey;
  fields: { key: string; label: string; secret: boolean }[];
  existing: { name: string; fields: string[] } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!existing);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const creds: Record<string, string> = {};
    for (const f of fields) {
      const v = (fd.get(f.key) as string)?.trim();
      if (v) creds[f.key] = v;
    }
    startTransition(async () => {
      await saveIntegration(provider, provider, creds);
      setEditing(false);
      router.refresh();
    });
  }

  function test() {
    startTransition(async () => {
      setTestResult(await testIntegration(provider));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {existing && !editing ? (
        <div className="text-sm text-muted-foreground">
          Tersimpan: {existing.fields.join(", ") || "-"}
          {existing.fields.some((f) => fields.find((x) => x.key === f)?.secret) && " (terenkripsi)"}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`${provider}-${f.key}`} className="text-xs">{f.label}</Label>
              <Input
                id={`${provider}-${f.key}`}
                name={f.key}
                type={f.secret ? "password" : "text"}
                placeholder={f.secret ? "••••••••" : ""}
                autoComplete="off"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={pending}>Simpan</Button>
            {existing && (
              <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)}>Batal</Button>
            )}
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {existing && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Ubah</Button>
        )}
        {existing && (
          <Button size="sm" variant="outline" onClick={test} disabled={pending}>
            {pending ? "Testing..." : "Test Koneksi"}
          </Button>
        )}
      </div>
      {testResult && (
        <p className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}>
          {testResult.detail}
        </p>
      )}
    </div>
  );
}
