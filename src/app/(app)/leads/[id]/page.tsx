import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Globe, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { LeadService } from "@/server/services/lead-service";
import { requireUserId, requireActorId } from "@/lib/session";
import { CampaignService } from "@/server/services/campaign-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_COLORS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  LeadStatusSelect, TagPanel, CampaignPanel, ContactsPanel, NoteForm, ScoreButton,
} from "./detail-panels";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const uid = await requireUserId();
  const actor = await requireActorId();
  const [lead, allTags, campaignRows] = await Promise.all([
    LeadService.getById(id, uid),
    LeadService.listTags(uid),
    CampaignService.list({ userId: actor }),
  ]);
  if (!lead) notFound();

  const latestScore = lead.scores[0];

  return (
    <div>
      <PageHeader
        title={lead.businessName}
        description={[lead.industry, lead.businessType].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
            <Button
              variant="outline"
              render={<Link href={`/outreach/generate?lead=${lead.id}`}>Generate Pesan</Link>}
            />
            <Button
              variant="outline"
              render={
                <Link href={`/leads/${lead.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> {t.common.edit}
                </Link>
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Informasi
                <StatusBadge
                  label={t.leads.statuses[lead.status]}
                  colorClass={LEAD_STATUS_COLORS[lead.status]}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <InfoRow label="Kontak Person" value={lead.contactPerson} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Telepon" value={lead.phone} />
              <InfoRow label="WhatsApp" value={lead.whatsappNumber} />
              <InfoRow label="Website" value={lead.website} />
              <InfoRow label="Alamat" value={lead.address} />
              <InfoRow
                label="Lokasi"
                value={[lead.city, lead.province, lead.country].filter(Boolean).join(", ")}
              />
              <InfoRow label="Sumber" value={lead.source} />
              {lead.sourceUrl && (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">URL Sumber</span>
                  <a
                    href={lead.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <InfoRow
                label="Follow-up berikutnya"
                value={lead.nextFollowUpAt ? format(lead.nextFollowUpAt, "dd MMM yyyy", { locale: localeId }) : null}
              />
              <InfoRow
                label="Terakhir dihubungi"
                value={lead.lastContactedAt ? format(lead.lastContactedAt, "dd MMM yyyy", { locale: localeId }) : null}
              />
            </CardContent>
          </Card>

          {lead.researchNotes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Catatan Riset</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{lead.researchNotes}</p>
              </CardContent>
            </Card>
          )}

          <ContactsPanel leadId={lead.id} contacts={lead.contacts} />

          <Card>
            <CardHeader><CardTitle className="text-base">Aktivitas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <NoteForm leadId={lead.id} />
              {lead.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
              ) : (
                <ul className="space-y-3">
                  {lead.activities.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 border-b pb-3 text-sm last:border-0">
                      <div>
                        <Badge variant="outline" className="mr-2">{a.type}</Badge>
                        {a.description}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDistanceToNow(a.createdAt, { addSuffix: true, locale: localeId })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Skor Lead</CardTitle>
              <ScoreButton leadId={lead.id} />
            </CardHeader>
            <CardContent className="space-y-2">
              {!latestScore ? (
                <p className="text-sm text-muted-foreground">Belum dinilai</p>
              ) : (
                <>
                  <div className="text-3xl font-bold">{latestScore.score}<span className="text-base font-normal text-muted-foreground">/100</span></div>
                  <Badge variant="secondary">{latestScore.level}</Badge>
                  {latestScore.reasoning && (
                    <p className="text-sm text-muted-foreground">{latestScore.reasoning}</p>
                  )}
                  {latestScore.recommendedAction && (
                    <p className="text-sm"><span className="font-medium">Rekomendasi:</span> {latestScore.recommendedAction}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <TagPanel leadId={lead.id} leadTags={lead.tags} allTags={allTags} />
          <CampaignPanel
            leadId={lead.id}
            memberships={lead.campaigns.map((c) => ({ id: c.id, name: c.name, clStatus: c.clStatus }))}
            allCampaigns={campaignRows.map((r) => ({ id: r.campaign.id, name: r.campaign.name }))}
          />
        </div>
      </div>
    </div>
  );
}
