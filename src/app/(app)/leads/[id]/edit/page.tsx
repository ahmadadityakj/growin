import { notFound } from "next/navigation";
import { LeadService } from "@/server/services/lead-service";
import { PageHeader } from "@/components/shared/page-header";
import { LeadForm } from "../../lead-form";
import { updateLead } from "../../actions";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await LeadService.getById(id);
  if (!lead) notFound();

  const bound = updateLead.bind(null, id);

  return (
    <div>
      <PageHeader title={`Edit: ${lead.businessName}`} />
      <LeadForm
        lead={{
          id: lead.id,
          businessName: lead.businessName,
          contactPerson: lead.contactPerson,
          industry: lead.industry,
          businessType: lead.businessType,
          email: lead.email,
          phone: lead.phone,
          whatsappNumber: lead.whatsappNumber,
          website: lead.website,
          address: lead.address,
          city: lead.city,
          province: lead.province,
          country: lead.country,
          sourceUrl: lead.sourceUrl,
          researchNotes: lead.researchNotes,
          status: lead.status,
          score: lead.score,
          assignedUserId: lead.assignedUserId,
          nextFollowUpAt: lead.nextFollowUpAt?.toISOString().slice(0, 10) ?? null,
        }}
        onSubmit={bound}
      />
    </div>
  );
}
