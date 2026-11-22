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
import { t } from "@/lib/i18n";
import type { ProductInput } from "@/server/services/product-service";

type Product = ProductInput & { id: string };

function toList(v: string): string[] {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fromList(v?: string[] | null): string {
  return (v ?? []).join("\n");
}

export function ProductForm({
  product,
  onSubmit,
}: {
  product?: Product;
  onSubmit: (input: ProductInput) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(product?.status ?? "draft");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const slug =
      (fd.get("slug") as string) ||
      (fd.get("name") as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const input: ProductInput = {
      name: fd.get("name") as string,
      slug,
      description: (fd.get("description") as string) || undefined,
      websiteUrl: (fd.get("websiteUrl") as string) || undefined,
      category: (fd.get("category") as string) || undefined,
      targetAudience: (fd.get("targetAudience") as string) || undefined,
      targetIndustries: toList(fd.get("targetIndustries") as string),
      targetLocations: toList(fd.get("targetLocations") as string),
      mainSellingPoints: toList(fd.get("mainSellingPoints") as string),
      keyFeatures: toList(fd.get("keyFeatures") as string),
      pricingInfo: (fd.get("pricingInfo") as string) || undefined,
      status: status as ProductInput["status"],
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
          <div className="space-y-2">
            <Label htmlFor="name">{t.products.fields.name} *</Label>
            <Input id="name" name="name" required defaultValue={product?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t.products.fields.slug}</Label>
            <Input id="slug" name="slug" placeholder="auto dari nama" defaultValue={product?.slug} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t.products.fields.description}</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={product?.description ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">{t.products.fields.websiteUrl}</Label>
            <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={product?.websiteUrl ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{t.products.fields.category}</Label>
            <Input id="category" name="category" defaultValue={product?.category ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="targetAudience">{t.products.fields.targetAudience}</Label>
            <Input id="targetAudience" name="targetAudience" defaultValue={product?.targetAudience ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetIndustries">{t.products.fields.targetIndustries}</Label>
            <Textarea id="targetIndustries" name="targetIndustries" rows={2} placeholder="Satu per baris" defaultValue={fromList(product?.targetIndustries)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetLocations">{t.products.fields.targetLocations}</Label>
            <Textarea id="targetLocations" name="targetLocations" rows={2} placeholder="Satu per baris" defaultValue={fromList(product?.targetLocations)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mainSellingPoints">{t.products.fields.mainSellingPoints}</Label>
            <Textarea id="mainSellingPoints" name="mainSellingPoints" rows={3} placeholder="Satu per baris" defaultValue={fromList(product?.mainSellingPoints)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyFeatures">{t.products.fields.keyFeatures}</Label>
            <Textarea id="keyFeatures" name="keyFeatures" rows={3} placeholder="Satu per baris" defaultValue={fromList(product?.keyFeatures)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricingInfo">{t.products.fields.pricingInfo}</Label>
            <Textarea id="pricingInfo" name="pricingInfo" rows={2} defaultValue={product?.pricingInfo ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t.products.fields.status}</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="archived">archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}

          <div className="flex gap-2 md:col-span-2">
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
