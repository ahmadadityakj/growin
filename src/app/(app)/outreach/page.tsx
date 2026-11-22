import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { t } from "@/lib/i18n";

export default function Page() {
  return (
    <div>
      <PageHeader title={t.nav.outreach} />
      <EmptyState title="Segera hadir" description="Modul ini sedang dalam pengembangan." />
    </div>
  );
}
