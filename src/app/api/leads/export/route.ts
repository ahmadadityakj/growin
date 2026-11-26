import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { LeadService } from "@/server/services/lead-service";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = await TeamService.resolveScope(session.user.id);
  if (scope !== session.user.id) {
    return NextResponse.json({ error: "Hanya pemilik workspace yang bisa export" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const rows = await LeadService.exportRows({
    ownerId: await TeamService.resolveScope(session.user.id),
    search: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    industry: sp.get("industry") ?? undefined,
    city: sp.get("city") ?? undefined,
    campaignId: sp.get("campaign") ?? undefined,
    tagId: sp.get("tag") ?? undefined,
  });

  const data = rows.map((l) => ({
    businessName: l.businessName,
    contactPerson: l.contactPerson ?? "",
    industry: l.industry ?? "",
    businessType: l.businessType ?? "",
    email: l.email ?? "",
    phone: l.phone ?? "",
    whatsapp: l.whatsappNumber ?? "",
    website: l.website ?? "",
    address: l.address ?? "",
    city: l.city ?? "",
    province: l.province ?? "",
    country: l.country ?? "",
    status: l.status,
    score: l.score ?? "",
    source: l.source,
    sourceUrl: l.sourceUrl ?? "",
    createdAt: l.createdAt.toISOString().slice(0, 10),
  }));

  const csv = Papa.unparse(data);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="growin-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
