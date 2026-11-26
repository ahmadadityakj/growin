import { OutreachService } from "@/server/services/outreach-service";

/**
 * Sisa kuota kirim harian per channel + status rem darurat.
 * Cap WA ikut warm-up: nomor baru dibatasi lebih ketat sampai reputasinya terbangun.
 */
export async function SendQuota({
  teamIds,
  scopeId,
}: {
  teamIds: string[];
  scopeId: string;
}) {
  const [sent, waCap, emCap, waOptouts, waFailing, dupBodies] = await Promise.all([
    OutreachService.sentToday(teamIds),
    OutreachService.dailyCapFor("whatsapp", teamIds),
    OutreachService.dailyCapFor("email", teamIds),
    OutreachService.optoutsToday(scopeId, "whatsapp"),
    OutreachService.consecutiveFailures("whatsapp", teamIds),
    OutreachService.duplicateBodyCount(teamIds),
  ]);
  const wa = sent.whatsapp ?? 0;
  const em = sent.email ?? 0;
  const braked = waOptouts >= 3 || waFailing;

  return (
    <div className="mb-4 space-y-1">
      <p className="text-xs text-muted-foreground">
        Terkirim hari ini: WhatsApp {wa}/{waCap} · Email {em}/{emCap}. Cap WhatsApp naik
        bertahap saat umur nomor bertambah; pesan melewati kuota otomatis dijadwalkan ke
        hari berikutnya dan tidak dikirim malam hari.
      </p>
      {braked && (
        <p className="text-xs font-medium text-amber-700">
          {waFailing
            ? "Pengiriman WhatsApp ditahan: 5 kirim terakhir gagal beruntun. Periksa koneksi nomor/provider Anda di Integrations."
            : `Pengiriman WhatsApp ditahan: ${waOptouts} leads minta berhenti dihubungi hari ini. Evaluasi isi pesan sebelum lanjut.`}
        </p>
      )}
      {dupBodies > 0 && (
        <p className="text-xs font-medium text-amber-700">
          {dupBodies} pesan dalam antrean punya isi yang sama persis. Kirim pesan identik
          massal mempercepat blokir nomor — pakai generator AI atau edit supaya tiap pesan bervariasi.
        </p>
      )}
    </div>
  );
}
