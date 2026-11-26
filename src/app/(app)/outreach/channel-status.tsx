import Link from "next/link";
import { IntegrationService } from "@/server/services/integration-service";

/** Peringatan kalau channel pengiriman belum dikonfigurasi — pesan tetap bisa dibuat tapi tidak terkirim. */
export async function ChannelStatus({ scopeId }: { scopeId: string }) {
  const [wa, em] = await Promise.all([
    IntegrationService.hasConfiguredChannel("whatsapp", scopeId),
    IntegrationService.hasConfiguredChannel("email", scopeId),
  ]);
  if (wa && em) return null;

  const missing = [!wa && "WhatsApp", !em && "Email"].filter(Boolean).join(" & ");
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-medium">Channel {missing} belum dikonfigurasi.</span>{" "}
      Pesan tetap bisa dibuat & direview, tapi tidak akan terkirim sampai Anda aktifkan provider
      sendiri di{" "}
      <Link href="/integrations" className="font-medium underline">
        Integrations
      </Link>
      . Pesan terkirim atas nama nomor/domain Anda, bukan Growin.
    </div>
  );
}
