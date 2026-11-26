import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { unsubscribeRecords, leads } from "@/server/db/schema";
import { Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnsubscribeForm } from "./unsubscribe-form";
import { ForceLight } from "@/components/theme/force-light";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; c?: string }>;
}) {
  const { e: identifier, c: channel } = await searchParams;
  const ch = channel === "whatsapp" ? "whatsapp" : "email";

  let already = false;
  if (identifier) {
    const existing = await db.query.unsubscribeRecords.findFirst({
      where: and(
        eq(unsubscribeRecords.identifier, identifier),
        eq(unsubscribeRecords.channel, ch)
      ),
    });
    already = Boolean(existing);
  }

  return (
    <ForceLight>
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Sprout className="h-6 w-6" />
          </div>
          <CardTitle>Berhenti Berlangganan</CardTitle>
        </CardHeader>
        <CardContent>
          {already ? (
            <p className="text-center text-sm text-muted-foreground">
              <strong>{identifier}</strong> sudah ada di daftar unsubscribe {ch}. Anda tidak akan menerima pesan lagi.
            </p>
          ) : (
            <UnsubscribeForm identifier={identifier ?? ""} channel={ch} />
          )}
        </CardContent>
      </Card>
    </div>
    </ForceLight>
  );
}
