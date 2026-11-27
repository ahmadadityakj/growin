"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createTemplate, updateTemplate, deleteTemplate } from "../actions";
import type { outreachTemplates } from "@/server/db/schema";

type Template = typeof outreachTemplates.$inferSelect;

export function TemplateDialog({
  template,
  products,
}: {
  template?: Template;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState(template?.channel ?? "whatsapp");
  const [productId, setProductId] = useState(template?.productId ?? "");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: fd.get("name") as string,
      channel: channel as "email" | "whatsapp",
      language: "id",
      tone: (fd.get("tone") as string) || null,
      subject: (fd.get("subject") as string) || null,
      body: fd.get("body") as string,
      productId: productId || null,
    };
    startTransition(async () => {
      try {
        if (template) await updateTemplate(template.id, input);
        else await createTemplate(input);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="flex gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            template ? (
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            ) : (
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Template Baru
              </Button>
            )
          }
        />
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{template ? "Edit Template" : "Template Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Template *</Label>
              <Input name="name" required defaultValue={template?.name} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => v && setChannel(v as typeof channel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Produk</Label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tone</Label>
              <Input name="tone" placeholder="mis: friendly, formal" defaultValue={template?.tone ?? ""} />
            </div>
            {channel === "email" && (
              <div className="space-y-1">
                <Label>Subjek</Label>
                <Input name="subject" defaultValue={template?.subject ?? ""} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Isi Pesan *</Label>
              <Textarea name="body" rows={6} required defaultValue={template?.body} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {template && (
        <ConfirmDialog
          title={`Hapus template "${template.name}"?`}
          onConfirm={async () => { await deleteTemplate(template.id); router.refresh(); }}
          trigger={
            <Button variant="outline" size="sm">
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          }
        />
      )}
    </div>
  );
}
