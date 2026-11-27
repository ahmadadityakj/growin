"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  addProductKnowledge, deleteProductKnowledge, toggleProductKnowledge,
} from "../../actions";

type Knowledge = {
  id: string; title: string; content: string; isActive: boolean;
};

export function KnowledgePanel({
  productId, items,
}: {
  productId: string;
  items: Knowledge[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      await addProductKnowledge(productId, fd.get("title") as string, fd.get("content") as string);
      setShowForm(false);
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">AI Knowledge</CardTitle>
          <p className="text-sm text-muted-foreground">
            Konteks tambahan yang dipakai AI saat menulis pesan & riset untuk produk ini.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-3 w-3" /> Tambah
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">Belum ada knowledge. Contoh: FAQ, studi kasus, kebijakan harga, differentiator vs kompetitor.</p>
        )}
        <ul className="space-y-3">
          {items.map((k) => (
            <li key={k.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={k.isActive}
                    onCheckedChange={(v) => run(() => toggleProductKnowledge(k.id, productId, Boolean(v)))}
                  />
                  <span className="font-medium text-sm">{k.title}</span>
                  {!k.isActive && <Badge variant="secondary">nonaktif</Badge>}
                </div>
                <ConfirmDialog
                  title={`Hapus "${k.title}"?`}
                  onConfirm={() => deleteProductKnowledge(k.id, productId)}
                  trigger={<Button variant="ghost" size="icon-xs"><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                />
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{k.content}</p>
            </li>
          ))}
        </ul>
        {showForm && (
          <form onSubmit={submit} className="space-y-2 rounded-md border p-3">
            <Input name="title" placeholder="Judul (mis: FAQ, Harga, Studi Kasus)" required />
            <Textarea name="content" placeholder="Konten knowledge..." rows={4} required />
            <div className="flex gap-2">
              <Button size="sm" type="submit" disabled={pending}>Simpan</Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
