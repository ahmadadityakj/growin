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
import { createResearchJob } from "../actions";
import { t } from "@/lib/i18n";

export function ResearchForm({
  campaigns,
  products,
}: {
  campaigns: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [productId, setProductId] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createResearchJob({
          instruction: fd.get("instruction") as string,
          targetQuantity: Number(fd.get("targetQuantity")) || 50,
          targetIndustry: (fd.get("targetIndustry") as string) || null,
          targetLocation: (fd.get("targetLocation") as string) || null,
          targetAudience: (fd.get("targetAudience") as string) || null,
          campaignId: campaignId || null,
          productId: productId || null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instruction">Instruksi Riset *</Label>
            <Textarea
              id="instruction" name="instruction" required rows={3}
              placeholder="mis: Cari 100 sekolah swasta di Lombok, kumpulkan website resmi, email publik, telepon, alamat, dan kontak kepala sekolah jika tersedia."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetQuantity">Target Jumlah Lead</Label>
              <Input id="targetQuantity" name="targetQuantity" type="number" min={1} max={500} defaultValue={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetIndustry">Target Industri</Label>
              <Input id="targetIndustry" name="targetIndustry" placeholder="mis: sekolah swasta" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetLocation">Target Lokasi</Label>
              <Input id="targetLocation" name="targetLocation" placeholder="mis: Lombok" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audiens</Label>
              <Input id="targetAudience" name="targetAudience" placeholder="opsional" />
            </div>
            <div className="space-y-2">
              <Label>Kampanye (opsional)</Label>
              <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produk (opsional)</Label>
              <Select value={productId} onValueChange={(v) => setProductId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Mengantrekan..." : "Mulai Riset"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
