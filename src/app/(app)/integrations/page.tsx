import { IntegrationService, PROVIDER_FIELDS, type ProviderKey } from "@/server/services/integration-service";
import { env } from "@/lib/env";
import { requireUserId, requireActorId } from "@/lib/session";
import { TeamService } from "@/server/services/team-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationCard } from "./integration-card";
import { t } from "@/lib/i18n";

const PROVIDER_INFO: Record<ProviderKey, { title: string; desc: string; note?: string }> = {
  resend: { title: "Resend", desc: "Email untuk outreach & follow-up" },
  fonnte: {
    title: "Fonnte",
    desc: "Gateway WhatsApp untuk kirim pesan ke leads",
    note: "Kirim dari nomor WA pribadi Anda via Fonnte — jumlah harian terbatas dan nomor berisiko diblokir WA kalau terlalu agresif. Jaga volume rendah (±20–30 pesan/hari) dan personalisasi tiap pesan. Untuk volume besar, pakai WhatsApp Business API.",
  },
  openai: {
    title: "OpenAI",
    desc: "Mesin AI untuk riset, scoring, generate pesan",
    note: "Sudah aktif memakai AI bawaan platform. Isi API key sendiri untuk memilih model dan mengendalikan limit/biaya Anda.",
  },
  brave: { title: "Brave Search", desc: "Search API untuk riset pasar (gratis 2.000/bln)" },
  tavily: { title: "Tavily", desc: "Search API untuk riset pasar (gratis 1.000/bln)" },
  n8n: { title: "n8n", desc: "Workflow automation (opsional)" },
  whatsapp_business: {
    title: "WhatsApp Business API",
    desc: "WA resmi Meta (alternatif Fonnte)",
    note: "Channel resmi Meta — lebih aman untuk volume besar dan pesan template. Perlu Meta Business account, nomor khusus, dan persetujuan template pesan.",
  },
};

// provider yang punya default platform (dipakai otomatis bila workspace belum isi key)
const PLATFORM_DEFAULT: Partial<Record<ProviderKey, boolean>> = {
  openai: Boolean(env.OPENAI_API_KEY),
  tavily: Boolean(env.TAVILY_API_KEY),
  brave: Boolean(env.BRAVE_SEARCH_API_KEY),
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  error: "bg-red-100 text-red-800",
};

export default async function IntegrationsPage() {
  const uid = await requireUserId();
  const actor = await requireActorId();
  const isOwner = (await TeamService.resolveScope(actor)) === actor;
  const rows = await IntegrationService.list(uid);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return (
    <div>
      <PageHeader
        title={t.nav.integrations}
        description="Kelola API key & koneksi provider. Credential disimpan terenkripsi."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(PROVIDER_INFO) as ProviderKey[]).map((key) => {
          const row = byProvider.get(key);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {PROVIDER_INFO[key].title}
                  <div className="flex items-center gap-1.5">
                    {!row && PLATFORM_DEFAULT[key] && (
                      <StatusBadge label="bawaan platform" colorClass="bg-blue-100 text-blue-800" />
                    )}
                    <StatusBadge
                      label={row?.status ?? "not_configured"}
                      colorClass={STATUS_COLORS[row?.status ?? ""] ?? "bg-gray-100 text-gray-800"}
                    />
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{PROVIDER_INFO[key].desc}</p>
                {PROVIDER_INFO[key].note && (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">
                    {PROVIDER_INFO[key].note}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {!isOwner ? (
                  <p className="text-sm text-muted-foreground">
                    Kredensial hanya bisa dikelola oleh pemilik workspace.
                  </p>
                ) : (
                <IntegrationCard
                  provider={key}
                  fields={PROVIDER_FIELDS[key]}
                  existing={row ? { name: row.name, fields: Object.keys(row.credentials ?? {}) } : null}
                />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
