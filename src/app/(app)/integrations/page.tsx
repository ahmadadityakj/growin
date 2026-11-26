import { IntegrationService, PROVIDER_FIELDS, type ProviderKey } from "@/server/services/integration-service";
import { env } from "@/lib/env";
import { requireUserId, requireActorId } from "@/lib/session";
import { TeamService } from "@/server/services/team-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntegrationCard } from "./integration-card";
import { SlotSection, type SlotOption, type ProviderCardData } from "./slot-section";
import { t } from "@/lib/i18n";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  error: "bg-red-100 text-red-800",
};

const PROVIDER_NOTES: Partial<Record<ProviderKey, string>> = {
  fonnte:
    "Kirim dari nomor WA pribadi Anda via Fonnte — jumlah harian terbatas dan nomor berisiko diblokir WA kalau terlalu agresif. Jaga volume rendah (±20–30 pesan/hari) dan personalisasi tiap pesan.",
  whatsapp_business:
    "Channel resmi Meta — lebih aman untuk volume besar dan pesan template. Perlu Meta Business account, nomor khusus, dan persetujuan template pesan.",
  openai:
    "Key Anda dipakai untuk riset, scoring, dan generate pesan. Limit & biaya mengikuti paket OpenAI Anda. Jika key limit/error, sistem fallback ke platform selama kuota paket masih ada.",
  brave: "Search API untuk riset pasar — gratis ±2.000 query/bln di paket Brave Anda.",
  tavily: "Search API untuk riset pasar — gratis ±1.000 query/bln di paket Tavily Anda.",
};

const AI_OPTIONS: SlotOption[] = [
  { value: "platform", label: "Bawaan platform", hint: "Langsung jalan — kuota mengikuti paket Growin Anda" },
  { value: "openai", label: "API key OpenAI sendiri", hint: "Limit & biaya mengikuti paket OpenAI Anda" },
];

const SEARCH_OPTIONS: SlotOption[] = [
  { value: "platform", label: "Bawaan platform", hint: "Kuota mengikuti paket Growin Anda" },
  { value: "brave", label: "Brave Search", hint: "Key sendiri — gratis ±2.000 query/bln" },
  { value: "tavily", label: "Tavily", hint: "Key sendiri — gratis ±1.000 query/bln" },
];

const WA_OPTIONS: SlotOption[] = [
  { value: "fonnte", label: "Fonnte", hint: "Mudah — kirim dari nomor WA pribadi, volume kecil" },
  { value: "whatsapp_business", label: "WhatsApp Business API", hint: "Resmi Meta — untuk volume besar" },
];

const STANDALONE: { key: ProviderKey; title: string; desc: string }[] = [
  { key: "resend", title: "Resend (Email)", desc: "Channel email untuk outreach & follow-up" },
  { key: "n8n", title: "n8n", desc: "Workflow automation (opsional)" },
];

export default async function IntegrationsPage() {
  const uid = await requireUserId();
  const actor = await requireActorId();
  const isOwner = (await TeamService.resolveScope(actor)) === actor;
  const rows = await IntegrationService.list(uid);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  // pilihan aktif per slot = row non-inactive terakhir diupdate; ai/search: none = platform
  function slotSelected(members: ProviderKey[], hasPlatform: boolean): string | null {
    const active = rows
      .filter((r) => members.includes(r.provider) && r.status !== "inactive")
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))[0];
    if (active) return active.provider;
    return hasPlatform ? "platform" : null;
  }

  function cardData(key: ProviderKey): ProviderCardData {
    const row = byProvider.get(key);
    const cfg = (row?.config ?? {}) as Record<string, string>;
    return {
      fields: PROVIDER_FIELDS[key],
      existing: row ? { name: row.name, fields: Object.keys(row.credentials ?? {}) } : null,
      status: row?.status ?? "not_configured",
      statusColor: STATUS_COLORS[row?.status ?? ""] ?? "bg-gray-100 text-gray-800",
      note: PROVIDER_NOTES[key],
      lastError: cfg.lastError,
      lastErrorAt: cfg.lastErrorAt,
      lastFallbackAt: cfg.lastFallbackAt,
    };
  }

  const platformReady = Boolean(env.OPENAI_API_KEY || env.TAVILY_API_KEY || env.BRAVE_SEARCH_API_KEY);

  return (
    <div>
      <PageHeader
        title={t.nav.integrations}
        description="Pilih provider untuk tiap kemampuan. Credential disimpan terenkripsi."
      />

      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
        <strong>Bawaan platform</strong> memakai kuota paket Growin Anda.{" "}
        <strong>Provider dengan key sendiri</strong> mengikuti limit & biaya akun Anda di provider
        tersebut — jika provider Anda limit atau error, sistem otomatis fallback ke bawaan platform
        selama kuota paket masih ada.
        {!platformReady && (
          <span className="mt-1 block font-medium">
            Catatan: bawaan platform belum dikonfigurasi admin — isi key sendiri untuk memakai fitur AI.
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SlotSection
          slot="ai"
          title="Mesin AI"
          description="Untuk riset pasar, scoring lead, dan generate pesan."
          options={AI_OPTIONS}
          selected={slotSelected(["openai"], true)}
          providers={{ openai: cardData("openai") }}
          platformNote="Menggunakan AI bawaan Growin — kuota mengikuti paket Anda."
          isOwner={isOwner}
        />
        <SlotSection
          slot="search"
          title="Mesin Pencari"
          description="Sumber pencarian web untuk riset pasar."
          options={SEARCH_OPTIONS}
          selected={slotSelected(["brave", "tavily"], true)}
          providers={{ brave: cardData("brave"), tavily: cardData("tavily") }}
          platformNote="Menggunakan pencari bawaan Growin — kuota mengikuti paket Anda."
          isOwner={isOwner}
        />
        <SlotSection
          slot="whatsapp"
          title="Channel WhatsApp"
          description="Pilih satu — pesan terkirim atas nama nomor Anda, bukan Growin."
          options={WA_OPTIONS}
          selected={slotSelected(["fonnte", "whatsapp_business"], false)}
          providers={{ fonnte: cardData("fonnte"), whatsapp_business: cardData("whatsapp_business") }}
          isOwner={isOwner}
        />
        {STANDALONE.map((p) => {
          const row = byProvider.get(p.key);
          return (
            <Card key={p.key}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {p.title}
                  <StatusBadge
                    label={row?.status ?? "not_configured"}
                    colorClass={STATUS_COLORS[row?.status ?? ""] ?? "bg-gray-100 text-gray-800"}
                  />
                </CardTitle>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardHeader>
              <CardContent>
                {!isOwner ? (
                  <p className="text-sm text-muted-foreground">
                    Kredensial hanya bisa dikelola oleh pemilik workspace.
                  </p>
                ) : (
                  <IntegrationCard
                    provider={p.key}
                    fields={PROVIDER_FIELDS[p.key]}
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
