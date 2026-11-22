import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "../lead-form";
import { createLead } from "../actions";
import { t } from "@/lib/i18n";

export default function NewLeadPage() {
  return (
    <div>
      <PageHeader title={t.leads.new} />
      <LeadForm onSubmit={createLead} />
    </div>
  );
}
