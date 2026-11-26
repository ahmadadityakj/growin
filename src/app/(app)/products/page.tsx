import Link from "next/link";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { ProductService } from "@/server/services/product-service";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { t } from "@/lib/i18n";
import { deleteProduct } from "./actions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const uid = await requireUserId();
  const items = await ProductService.list({ search: q, ownerId: uid });

  return (
    <div>
      <PageHeader
        title={t.products.title}
        actions={
          <Button
            render={
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t.products.new}
              </Link>
            }
          />
        }
      />

      <form className="mb-4 flex gap-2" action="/products">
        <Input name="q" placeholder={`${t.common.search}...`} defaultValue={q} className="max-w-xs" />
        <Button type="submit" variant="outline">{t.common.search}</Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t.products.empty}
          action={
            <Button
              render={
                <Link href="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.products.new}
                </Link>
              }
            />
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.products.fields.name}</TableHead>
                <TableHead>{t.products.fields.category}</TableHead>
                <TableHead>{t.products.fields.targetAudience}</TableHead>
                <TableHead>{t.products.fields.status}</TableHead>
                <TableHead className="w-24 text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </TableCell>
                  <TableCell>{p.category ?? "-"}</TableCell>
                  <TableCell className="max-w-56 truncate">{p.targetAudience ?? "-"}</TableCell>
                  <TableCell>
                    <StatusBadge label={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        render={
                          <Link href={`/products/${p.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        }
                      />
                      <ConfirmDialog
                        title={`Hapus produk "${p.name}"?`}
                        description="Produk akan diarsipkan dan tidak ditampilkan lagi."
                        confirmLabel={t.common.delete}
                        onConfirm={deleteProduct.bind(null, p.id)}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
