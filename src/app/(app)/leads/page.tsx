import Link from "next/link";
import { Plus, Users, Upload, Download, UserCheck } from "lucide-react";
import { LeadService } from "@/server/services/lead-service";
import { CampaignService } from "@/server/services/campaign-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LeadsTable } from "./leads-table";
import { LEAD_STATUSES } from "@/lib/constants";
import { t } from "@/lib/i18n";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  const [result, allTags, campaignRows] = await Promise.all([
    LeadService.list({
      search: sp.q,
      status: sp.status,
      industry: sp.industry,
      city: sp.city,
      campaignId: sp.campaign,
      tagId: sp.tag,
      page,
      pageSize: 20,
    }),
    LeadService.listTags(),
    CampaignService.list(),
  ]);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `/leads?${params.toString()}`;
  }

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") exportParams.set(k, v);

  return (
    <div>
      <PageHeader
        title={t.leads.title}
        actions={
          <>
            <Button
              variant="outline"
              render={
                <Link href={`/api/leads/export?${exportParams.toString()}`}>
                  <Download className="mr-2 h-4 w-4" /> {t.common.export}
                </Link>
              }
            />
            <Button
              variant="outline"
              render={
                <Link href="/leads/import">
                  <Upload className="mr-2 h-4 w-4" /> {t.common.import}
                </Link>
              }
            />
            <Button
              variant="outline"
              render={
                <Link href="/leads/enrichment">
                  <UserCheck className="mr-2 h-4 w-4" /> Enrichment Kontak
                </Link>
              }
            />
            <Button
              render={
                <Link href="/leads/new">
                  <Plus className="mr-2 h-4 w-4" /> {t.leads.new}
                </Link>
              }
            />
          </>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" action="/leads">
        <Input name="q" placeholder="Cari nama, kontak, email..." defaultValue={sp.q} className="w-64" />
        <Input name="industry" placeholder="Industri" defaultValue={sp.industry} className="w-40" />
        <Input name="city" placeholder="Kota" defaultValue={sp.city} className="w-40" />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">{t.common.status}: {t.common.all}</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{t.leads.statuses[s]}</option>
          ))}
        </select>
        <select
          name="campaign"
          defaultValue={sp.campaign ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Kampanye: {t.common.all}</option>
          {campaignRows.map(({ campaign }) => (
            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
          ))}
        </select>
        <select
          name="tag"
          defaultValue={sp.tag ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Tag: {t.common.all}</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">{t.common.filter}</Button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.leads.empty}
          action={
            <Button
              render={
                <Link href="/leads/new">
                  <Plus className="mr-2 h-4 w-4" /> {t.leads.new}
                </Link>
              }
            />
          }
        />
      ) : (
        <>
          <LeadsTable rows={result.rows} allTags={allTags} />
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {result.total} leads · halaman {result.page}/{result.totalPages}
            </span>
            <div className="flex gap-2">
              {result.page > 1 && (
                <Button variant="outline" size="sm" render={<Link href={pageUrl(result.page - 1)}>← Prev</Link>} />
              )}
              {result.page < result.totalPages && (
                <Button variant="outline" size="sm" render={<Link href={pageUrl(result.page + 1)}>Next →</Link>} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
