"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { LeadInput } from "@/server/services/lead-service";

type Lead = LeadInput & { id: string };

export function LeadForm({
  lead,
  onSubmit,
}: {
  lead?: Lead;
  onSubmit: (input: LeadInput) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(lead?.status ?? "new");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => (fd.get(k) as string) || null;
    const input: LeadInput = {
      businessName: fd.get("businessName") as string,
      contactPerson: g("contactPerson"),
      industry: g("industry"),
      businessType: g("businessType"),
      email: g("email"),
      phone: g("phone"),
      whatsappNumber: g("whatsappNumber"),
      website: g("website"),
      address: g("address"),
      city: g("city"),
      province: g("province"),
      country: g("country"),
      sourceUrl: g("sourceUrl"),
      researchNotes: g("researchNotes"),
      status: status as LeadInput["status"],
      score: fd.get("score") ? Number(fd.get("score")) : null,
      nextFollowUpAt: g("nextFollowUpAt"),
    };
    startTransition(async () => {
      try {
        await onSubmit(input);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  const f = (k: keyof Lead) => (lead?.[k] as string | null | undefined) ?? "";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="businessName">Nama Bisnis *</Label>
            <Input id="businessName" name="businessName" required defaultValue={lead?.businessName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPerson">Kontak Person</Label>
            <Input id="contactPerson" name="contactPerson" defaultValue={f("contactPerson")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industri</Label>
            <Input id="industry" name="industry" defaultValue={f("industry")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessType">Tipe Bisnis</Label>
            <Input id="businessType" name="businessType" placeholder="mis. swasta, negeri, UMKM" defaultValue={f("businessType")} />
          </div>
          <div className="space-y-2">
            <Label>{t.common.status}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t.leads.statuses[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={f("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telepon</Label>
            <Input id="phone" name="phone" defaultValue={f("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp</Label>
            <Input id="whatsappNumber" name="whatsappNumber" defaultValue={f("whatsappNumber")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={f("website")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Kota</Label>
            <Input id="city" name="city" defaultValue={f("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Provinsi</Label>
            <Input id="province" name="province" defaultValue={f("province")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" defaultValue={f("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Negara</Label>
            <Input id="country" name="country" defaultValue={f("country") || "Indonesia"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">URL Sumber</Label>
            <Input id="sourceUrl" name="sourceUrl" defaultValue={f("sourceUrl")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="score">Skor (0-100)</Label>
            <Input id="score" name="score" type="number" min={0} max={100} defaultValue={lead?.score ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextFollowUpAt">Follow-up Berikutnya</Label>
            <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={f("nextFollowUpAt").slice(0, 10)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="researchNotes">Catatan Riset</Label>
            <Textarea id="researchNotes" name="researchNotes" rows={3} defaultValue={f("researchNotes")} />
          </div>

          {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}

          <div className="flex gap-2 md:col-span-3">
            <Button type="submit" disabled={pending}>
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
