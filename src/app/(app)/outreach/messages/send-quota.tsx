import { OutreachService, SEND_PACING } from "@/server/services/outreach-service";

/** Sisa kuota kirim harian per channel — transparan supaya user paham pacing. */
export async function SendQuota({ teamIds }: { teamIds: string[] }) {
  const sent = await OutreachService.sentToday(teamIds);
  const wa = sent.whatsapp ?? 0;
  const em = sent.email ?? 0;
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      Terkirim hari ini: WhatsApp {wa}/{SEND_PACING.whatsapp.dailyCap} · Email{" "}
      {em}/{SEND_PACING.email.dailyCap}. Pesan diantrekan dengan jeda acak dan tidak dikirim
      malam hari; yang melewati kuota otomatis dijadwalkan ke hari berikutnya.
    </p>
  );
}
