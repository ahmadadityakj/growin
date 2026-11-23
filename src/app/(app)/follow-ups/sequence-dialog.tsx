"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createSequence, enrollLeads } from "./actions";

type Opt = { id: string; name: string };

export function SequenceDialog({
  mode,
  sequenceId,
  campaigns,
  products,
  templates,
  leads,
}: {
  mode: "create" | "enroll";
  sequenceId?: string;
  campaigns: Opt[];
  products: Opt[];
  templates: (Opt & { channel: string })[];
  leads: { id: string; businessName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [campaignId, setCampaignId] = useState("");
  const [productId, setProductId] = useState("");
  const [steps, setSteps] = useState<{ delayDays: number; templateId: string; instruction: string }[]>([
    { delayDays: 3, templateId: "", instruction: "" },
  ]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const valid = steps.filter((s) => s.templateId || s.instruction.trim());
    if (!valid.length) {
      setError("Minimal 1 step harus punya template atau instruksi");
      return;
    }
    startTransition(async () => {
      try {
        await createSequence({
          name: fd.get("name") as string,
          channel,
          campaignId: campaignId || null,
          productId: productId || null,
          steps: valid.map((s) => ({
            delayDays: s.delayDays,
            templateId: s.templateId || null,
            instruction: s.instruction || null,
          })),
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  function submitEnroll() {
    if (!sequenceId || selectedLeads.size === 0) return;
    startTransition(async () => {
      try {
        await enrollLeads(sequenceId, [...selectedLeads]);
        setOpen(false);
        setSelectedLeads(new Set());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  const channelTemplates = templates.filter((tp) => tp.channel === channel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Sequence Baru
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <UserPlus className="mr-1 h-3 w-3" /> Daftarkan Lead
            </Button>
          )
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Sequence Baru" : "Daftarkan Lead ke Sequence"}</DialogTitle>
        </DialogHeader>

        {mode === "create" ? (
          <form onSubmit={submitCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Sequence *</Label>
              <Input name="name" required placeholder="mis: Follow-up Sekolaa" />
            </div>
            <div className="grid grid-cols-3 gap-3">
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
                <Label>Kampanye</Label>
                <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Produk</Label>
                <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Steps (delay dihitung dari pesan sebelumnya)</Label>
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2 rounded border p-2">
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Hari +</Label>
                    <Input
                      type="number" min={0}
                      value={s.delayDays}
                      onChange={(e) => {
                        const n = [...steps];
                        n[i].delayDays = Number(e.target.value);
                        setSteps(n);
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Select
                      value={s.templateId}
                      onValueChange={(v) => {
                        const n = [...steps];
                        n[i].templateId = v ?? "";
                        setSteps(n);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Template (opsional)" /></SelectTrigger>
                      <SelectContent>
                        {channelTemplates.map((tp) => (
                          <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="atau instruksi AI, mis: ingatkan demo"
                      value={s.instruction}
                      onChange={(e) => {
                        const n = [...steps];
                        n[i].instruction = e.target.value;
                        setSteps(n);
                      }}
                    />
                  </div>
                  <Button
                    type="button" variant="ghost" size="sm"
                    disabled={steps.length <= 1}
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setSteps([...steps, { delayDays: 3, templateId: "", instruction: "" }])}
              >
                <Plus className="mr-1 h-3 w-3" /> Tambah Step
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded border p-3">
              {leads.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedLeads.has(l.id)}
                    onCheckedChange={(v) => {
                      const n = new Set(selectedLeads);
                      if (v) n.add(l.id); else n.delete(l.id);
                      setSelectedLeads(n);
                    }}
                  />
                  {l.businessName}
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={submitEnroll} disabled={pending || selectedLeads.size === 0}>
              {pending ? "Mendaftarkan..." : `Daftarkan ${selectedLeads.size} lead`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
