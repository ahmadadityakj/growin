import { desc, eq, isNull, and, or } from "drizzle-orm";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { leads } from "@/server/db/schema";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { EnrichmentTable } from "./enrichment-table";

export const metadata = { title: "Enrichment Kontak | Growin" };

export default async function EnrichmentPage() {
  // lead yang kontaknya belum verified, prioritaskan yang minim kontak
  const uid = await requireUserId();
  const rows = await db
    .select()
    .from(leads)
    .where(and(isNull(leads.deletedAt), eq(leads.contactVerified, false), eq(leads.ownerId, uid)))
    .orderBy(desc(leads.score), desc(leads.createdAt))
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Enrichment Kontak"
        description="Lengkapi & verifikasi kontak lead secara manual: klik link untuk cari di Google/Maps/Instagram, lalu paste nomor/email yang Anda temukan."
        actions={
          <Link href="/leads/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Tambah Lead Manual
            </Button>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Semua kontak sudah verified"
          description="Tidak ada lead yang perlu enrichment. Tambah lead baru atau jalankan riset dulu."
        />
      ) : (
        <EnrichmentTable rows={rows} />
      )}
    </div>
  );
}
