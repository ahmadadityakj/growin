import { IntegrationService, PROVIDER_FIELDS, type ProviderKey } from "@/server/services/integration-service";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationCard } from "./integration-card";
import { t } from "@/lib/i18n";

const PROVIDER_INFO: Record<ProviderKey, { title: string; desc: string }> = {
  resend: { title: "Resend", desc: "Email untuk outreach & follow-up" },
  fonnte: { title: "Fonnte", desc: "Gateway WhatsApp untuk kirim pesan ke leads" },
  openai: { title: "OpenAI", desc: "Mesin AI untuk riset, scoring, generate pesan" },
  brave: { title: "Brave Search", desc: "Search API untuk riset pasar (gratis 2.000/bln)" },
  tavily: { title: "Tavily", desc: "Search API untuk riset pasar (gratis 1.000/bln)" },
  n8n: { title: "n8n", desc: "Workflow automation (opsional)" },
  whatsapp_business: { title: "WhatsApp Business API", desc: "WA resmi Meta (alternatif Fonnte)" },
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  error: "bg-red-100 text-red-800",
};

export default async function IntegrationsPage() {
  const uid = await requireUserId();
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
                  <StatusBadge
                    label={row?.status ?? "not_configured"}
                    colorClass={STATUS_COLORS[row?.status ?? ""] ?? "bg-gray-100 text-gray-800"}
                  />
                </CardTitle>
                <p className="text-sm text-muted-foreground">{PROVIDER_INFO[key].desc}</p>
              </CardHeader>
              <CardContent>
                <IntegrationCard
                  provider={key}
                  fields={PROVIDER_FIELDS[key]}
                  existing={row ? { name: row.name, fields: Object.keys(row.credentials ?? {}) } : null}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
