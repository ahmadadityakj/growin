import Link from "next/link";
import { Plus, Megaphone, Pencil, Trash2 } from "lucide-react";
import { CampaignService } from "@/server/services/campaign-service";
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
import { CAMPAIGN_STATUS_COLORS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { deleteCampaign } from "./actions";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const uid = await requireUserId();
  const items = await CampaignService.list({ search: q, status, ownerId: uid });

  return (
    <div>
      <PageHeader
        title={t.campaigns.title}
        actions={
          <Button
            render={
              <Link href="/campaigns/new">
                <Plus className="mr-2 h-4 w-4" />
                {t.campaigns.new}
              </Link>
            }
          />
        }
      />

      <form className="mb-4 flex gap-2" action="/campaigns">
        <Input name="q" placeholder={`${t.common.search}...`} defaultValue={q} className="max-w-xs" />
        <Button type="submit" variant="outline">{t.common.search}</Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t.campaigns.empty}
          action={
            <Button
              render={
                <Link href="/campaigns/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.campaigns.new}
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
                <TableHead>{t.campaigns.fields.name}</TableHead>
                <TableHead>{t.campaigns.fields.product}</TableHead>
                <TableHead>{t.campaigns.fields.targetLocation}</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>{t.campaigns.fields.status}</TableHead>
                <TableHead className="w-24 text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ campaign, productName, leadCount }) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{productName ?? "-"}</TableCell>
                  <TableCell>{campaign.targetLocation ?? "-"}</TableCell>
                  <TableCell>
                    {leadCount}
                    {campaign.targetLeadQty ? ` / ${campaign.targetLeadQty}` : ""}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={campaign.status}
                      colorClass={CAMPAIGN_STATUS_COLORS[campaign.status]}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        render={
                          <Link href={`/campaigns/${campaign.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        }
                      />
                      <ConfirmDialog
                        title={`Hapus kampanye "${campaign.name}"?`}
                        confirmLabel={t.common.delete}
                        onConfirm={deleteCampaign.bind(null, campaign.id)}
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
