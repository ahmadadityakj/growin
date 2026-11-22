"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { t } from "@/lib/i18n";
import type { CampaignInput } from "@/server/services/campaign-service";

type Campaign = Omit<CampaignInput, "channels"> & {
  id: string;
  channels: string[];
};

export function CampaignForm({
  campaign,
  products,
  onSubmit,
}: {
  campaign?: Campaign;
  products: { id: string; name: string }[];
  onSubmit: (input: CampaignInput) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(campaign?.status ?? "draft");
  const [productId, setProductId] = useState(campaign?.productId ?? "");
  const [channels, setChannels] = useState<string[]>(campaign?.channels ?? []);

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input: CampaignInput = {
      name: fd.get("name") as string,
      productId,
      objective: (fd.get("objective") as string) || undefined,
      targetAudience: (fd.get("targetAudience") as string) || undefined,
      targetIndustry: (fd.get("targetIndustry") as string) || undefined,
      targetLocation: (fd.get("targetLocation") as string) || undefined,
      targetLeadQty: fd.get("targetLeadQty")
        ? Number(fd.get("targetLeadQty"))
        : null,
      status: status as CampaignInput["status"],
      startDate: (fd.get("startDate") as string) || null,
      endDate: (fd.get("endDate") as string) || null,
      channels: channels as CampaignInput["channels"],
    };
    startTransition(async () => {
      try {
        await onSubmit(input);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">{t.campaigns.fields.name} *</Label>
            <Input id="name" name="name" required defaultValue={campaign?.name} />
          </div>
          <div className="space-y-2">
            <Label>{t.campaigns.fields.product} *</Label>
            <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
              <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.campaigns.fields.status}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft", "active", "paused", "completed", "archived"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="objective">{t.campaigns.fields.objective}</Label>
            <Textarea id="objective" name="objective" rows={2} defaultValue={campaign?.objective ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAudience">{t.campaigns.fields.targetAudience}</Label>
            <Input id="targetAudience" name="targetAudience" defaultValue={campaign?.targetAudience ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetIndustry">{t.campaigns.fields.targetIndustry}</Label>
            <Input id="targetIndustry" name="targetIndustry" defaultValue={campaign?.targetIndustry ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetLocation">{t.campaigns.fields.targetLocation}</Label>
            <Input id="targetLocation" name="targetLocation" defaultValue={campaign?.targetLocation ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetLeadQty">{t.campaigns.fields.targetLeadQty}</Label>
            <Input id="targetLeadQty" name="targetLeadQty" type="number" min={1} defaultValue={campaign?.targetLeadQty ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">{t.campaigns.fields.startDate}</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={campaign?.startDate ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">{t.campaigns.fields.endDate}</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={campaign?.endDate ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t.campaigns.fields.channels}</Label>
            <div className="flex gap-6 pt-1">
              {(["email", "whatsapp"] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={channels.includes(ch)}
                    onCheckedChange={() => toggleChannel(ch)}
                  />
                  {ch === "email" ? "Email" : "WhatsApp"}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}

          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending || !productId}>
              {pending ? t.common.loading : t.common.save}
            </Button>
            <Button type="button" variant="outline" onClick={() => history.back()}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
