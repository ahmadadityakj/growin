"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importLeadsCsv } from "../actions";
import { t } from "@/lib/i18n";

export function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    startTransition(async () => {
      const text = await file.text();
      const res = await importLeadsCsv(text);
      setResult(res);
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader><CardTitle className="text-base">Upload CSV</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={!file || pending}>
              {pending ? "Mengimpor..." : "Impor"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/leads")}>
              {t.common.back}
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-4 rounded-md border p-4 text-sm">
            <p className="font-medium text-emerald-700">Berhasil impor: {result.imported}</p>
            <p className="text-muted-foreground">Dilewati (duplikat/invalid): {result.skipped}</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-auto text-xs text-destructive">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <Button size="sm" className="mt-3" render={<Link href="/leads">Lihat Leads</Link>} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
