"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LeadService, type LeadInput, type LeadStatus } from "@/server/services/lead-service";
import Papa from "papaparse";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createLead(input: LeadInput) {
  const session = await requireAuth();
  await LeadService.create(input, session.user.id);
  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLead(id: string, input: LeadInput) {
  const session = await requireAuth();
  await LeadService.update(id, input, session.user.id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const session = await requireAuth();
  await LeadService.updateStatus(id, status, session.user.id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function bulkUpdateLeadStatus(ids: string[], status: LeadStatus) {
  const session = await requireAuth();
  await LeadService.bulkUpdateStatus(ids, status, session.user.id);
  revalidatePath("/leads");
}

export async function deleteLeads(ids: string[]) {
  const session = await requireAuth();
  await LeadService.softDelete(ids, session.user.id);
  revalidatePath("/leads");
}

export async function createTag(name: string) {
  await requireAuth();
  const tag = await LeadService.createTag(name);
  revalidatePath("/leads");
  return tag?.id;
}

export async function addTagToLead(leadId: string, tagId: string) {
  const session = await requireAuth();
  await LeadService.addTagToLead(leadId, tagId, session.user.id);
  revalidatePath(`/leads/${leadId}`);
}

export async function removeTagFromLead(leadId: string, tagId: string) {
  await requireAuth();
  await LeadService.removeTagFromLead(leadId, tagId);
  revalidatePath(`/leads/${leadId}`);
}

export async function bulkAddTag(ids: string[], tagId: string) {
  const session = await requireAuth();
  await LeadService.bulkAddTag(ids, tagId);
  revalidatePath("/leads");
}

export async function addLeadToCampaign(leadId: string, campaignId: string) {
  const session = await requireAuth();
  await LeadService.addToCampaign(leadId, campaignId, session.user.id);
  revalidatePath(`/leads/${leadId}`);
}

export async function removeLeadFromCampaign(leadId: string, campaignId: string) {
  const session = await requireAuth();
  await LeadService.removeFromCampaign(leadId, campaignId, session.user.id);
  revalidatePath(`/leads/${leadId}`);
}

export async function addLeadNote(leadId: string, note: string) {
  const session = await requireAuth();
  await LeadService.logActivity(leadId, "note", note, session.user.id);
  revalidatePath(`/leads/${leadId}`);
}

export async function addLeadContact(
  leadId: string,
  data: { name: string; role?: string; email?: string; phone?: string; whatsappNumber?: string }
) {
  await requireAuth();
  await LeadService.addContact(leadId, data);
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLeadContact(contactId: string, leadId: string) {
  await requireAuth();
  await LeadService.deleteContact(contactId);
  revalidatePath(`/leads/${leadId}`);
}

export async function enrichLeadContact(
  leadId: string,
  data: {
    contactPerson?: string | null;
    whatsappNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    verified: boolean;
  }
) {
  const session = await requireAuth();
  const { db } = await import("@/server/db");
  const { leads, leadActivities } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");

  await db
    .update(leads)
    .set({
      contactPerson: data.contactPerson || undefined,
      whatsappNumber: data.whatsappNumber || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      contactVerified: data.verified,
      contactVerifiedAt: data.verified ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  await db.insert(leadActivities).values({
    leadId,
    type: "note",
    description: `Kontak diperbarui via enrichment${data.verified ? " (verified)" : ""}`,
    userId: session.user.id,
  });

  revalidatePath("/leads/enrichment");
  revalidatePath("/leads");
}

export async function importLeadsCsv(csvText: string) {
  const session = await requireAuth();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const result = await LeadService.importRows(parsed.data, session.user.id);
  revalidatePath("/leads");
  return result;
}
