import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "../lead-form";
import { TeamService } from "@/server/services/team-service";
import { requireUserId } from "@/lib/session";
import { createLead } from "../actions";
import { t } from "@/lib/i18n";

export default async function NewLeadPage() {
  const uid = await requireUserId();
  const assignees = await TeamService.assignableUsers(uid);
  return (
    <div>
      <PageHeader title={t.leads.new} />
      <LeadForm assignees={assignees} onSubmit={createLead} />
    </div>
  );
}
