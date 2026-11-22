"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Save, Send, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { generateMessages, createDraftMessage, createTemplate } from "../actions";
import type { GeneratedMessage } from "@/server/services/message-generation-service";

type Lead = { id: string; label: string; hasEmail: boolean; hasWa: boolean };

export function GeneratorForm({
  leads,
  products,
  campaigns,
  defaults,
}: {
  leads: Lead[];
  products: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  defaults: { leadId?: string; productId?: string; campaignId?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [leadId, setLeadId] = useState(defaults.leadId ?? "");
  const [productId, setProductId] = useState(defaults.productId ?? "");
  const [campaignId, setCampaignId] = useState(defaults.campaignId ?? "");
  const [channel, setChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("id");
  const [instruction, setInstruction] = useState("");
  const [variations, setVariations] = useState<GeneratedMessage[]>([]);
  const [draftIdx, setDraftIdx] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");

  const selectedLead = leads.find((l) => l.id === leadId);
  const canSend = channel === "email" ? selectedLead?.hasEmail : selectedLead?.hasWa;

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateMessages({
          leadId, productId,
          campaignId: campaignId || null,
          channel, tone: tone as "formal" | "friendly" | "casual",
          language: language as "id" | "en",
          instruction: instruction || null,
          variations: 2,
        });
        setVariations(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal generate");
      }
    });
  }

  function saveDraft(idx: number) {
    const m = variations[idx];
    startTransition(async () => {
      try {
        await createDraftMessage({
          leadId, productId: productId || null,
          campaignId: campaignId || null,
          channel, subject: m.subject ?? null, body: m.body,
        });
        router.push("/outreach/messages");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal buat draft");
      }
    });
  }

  function saveTemplate(idx: number) {
    const m = variations[idx];
    startTransition(async () => {
      try {
        await createTemplate({
          name: templateName || `Template ${channel} ${new Date().toLocaleDateString("id")}`,
          channel, language, tone,
          subject: m.subject ?? null, body: m.body,
          productId: productId || null,
        });
        router.push("/outreach/templates");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal simpan template");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Parameter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lead *</Label>
            <Select value={leadId} onValueChange={(v) => setLeadId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Pilih lead" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Produk *</Label>
              <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kampanye</Label>
              <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Opsional" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => v && setChannel(v as typeof channel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bahasa</Label>
              <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Instruksi tambahan (opsional)</Label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              placeholder="mis: tekankan gratis trial 14 hari, atau fokus ke efisiensi biaya"
            />
          </div>
          {selectedLead && !canSend && (
            <p className="text-sm text-amber-600">
              Lead ini tidak punya {channel === "email" ? "email" : "nomor WhatsApp"} — draft tidak bisa dibuat.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={generate} disabled={pending || !leadId || !productId}>
            <Sparkles className="mr-2 h-4 w-4" />
            {pending ? "Generating..." : variations.length ? "Regenerate" : "Generate"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {variations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Variasi pesan akan muncul di sini setelah generate.
            </CardContent>
          </Card>
        ) : (
          variations.map((m, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  Variasi {i + 1}
                  <Badge variant="secondary">{channel}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {channel === "email" && (
                  <Input
                    value={m.subject ?? ""}
                    onChange={(e) =>
                      setVariations((v) => v.map((x, j) => (j === i ? { ...x, subject: e.target.value } : x)))
                    }
                    placeholder="Subjek email"
                  />
                )}
                <Textarea
                  value={m.body}
                  rows={channel === "email" ? 8 : 5}
                  onChange={(e) =>
                    setVariations((v) => v.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    size="sm" disabled={!canSend || pending}
                    onClick={() => saveDraft(i)}
                  >
                    <Send className="mr-1 h-3 w-3" /> Buat Draft → Approval
                  </Button>
                  <Dialog open={draftIdx === i} onOpenChange={(o) => setDraftIdx(o ? i : null)}>
                    <DialogTrigger
                      render={
                        <Button size="sm" variant="outline">
                          <Save className="mr-1 h-3 w-3" /> Simpan Template
                        </Button>
                      }
                    />
                    <DialogContent>
                      <DialogHeader><DialogTitle>Simpan sebagai Template</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="Nama template"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                        <Button onClick={() => saveTemplate(i)} disabled={pending}>Simpan</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
