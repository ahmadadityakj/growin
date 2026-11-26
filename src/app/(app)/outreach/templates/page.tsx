import { Plus, LayoutTemplate } from "lucide-react";
import { TemplateService } from "@/server/services/message-generation-service";
import { ProductService } from "@/server/services/product-service";
import { requireUserId, requireActorId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutreachNav } from "../nav";
import { TemplateDialog } from "./template-dialog";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default async function TemplatesPage() {
  const uid = await requireUserId();
  const actor = await requireActorId();
  const [templates, products] = await Promise.all([
    TemplateService.list({ ownerId: actor }),
    ProductService.list({ status: "active", ownerId: uid }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return (
    <div>
      <PageHeader
        title="Outreach · Templates"
        actions={<TemplateDialog products={products.map((p) => ({ id: p.id, name: p.name }))} />}
      />
      <OutreachNav />

      {templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Belum ada template"
          description="Simpan pesan yang sudah digenerate/disetujui sebagai template untuk dipakai ulang."
          action={<TemplateDialog products={products.map((p) => ({ id: p.id, name: p.name }))} />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {tpl.name}
                  <StatusBadge label={tpl.channel} />
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {tpl.productId ? productMap.get(tpl.productId) : "Semua produk"} ·{" "}
                  {formatDistanceToNow(tpl.createdAt, { addSuffix: true, locale: localeId })}
                </div>
              </CardHeader>
              <CardContent>
                {tpl.subject && <div className="mb-1 text-sm font-medium">{tpl.subject}</div>}
                <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{tpl.body}</p>
                <div className="mt-3 flex gap-2">
                  <TemplateDialog
                    template={tpl}
                    products={products.map((p) => ({ id: p.id, name: p.name }))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
