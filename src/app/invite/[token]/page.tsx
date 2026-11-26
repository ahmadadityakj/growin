import Link from "next/link";
import { Sprout, Users } from "lucide-react";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ForceLight } from "@/components/theme/force-light";
import { AcceptInviteButton } from "./accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, invite] = await Promise.all([auth(), TeamService.getInviteByToken(token)]);

  const now = new Date();
  const invalid =
    !invite || invite.acceptedAt || invite.expiresAt < now;
  const reason = !invite
    ? "Undangan tidak ditemukan."
    : invite.acceptedAt
      ? "Undangan ini sudah dipakai."
      : "Undangan sudah kedaluwarsa. Minta pemilik workspace mengirim ulang.";

  const emailMatch = session?.user?.email?.toLowerCase() === invite?.email;

  return (
    <ForceLight>
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Sprout className="h-8 w-8" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            {invalid ? (
              <>
                <h1 className="text-xl font-bold">Undangan tidak berlaku</h1>
                <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
                <Button className="mt-6" render={<Link href="/login" />}>
                  Ke halaman masuk
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Users className="h-6 w-6" />
                </div>
                <h1 className="text-xl font-bold">Anda diundang bergabung</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {invite.ownerName ?? invite.ownerEmail}
                  </span>{" "}
                  mengundang <span className="font-medium text-foreground">{invite.email}</span> untuk
                  bergabung ke workspace mereka di Growin.
                </p>
                <div className="mt-6 space-y-3">
                  {session?.user ? (
                    emailMatch ? (
                      <AcceptInviteButton token={token} />
                    ) : (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        Anda masuk sebagai {session.user.email}. Undangan ini untuk {invite.email},
                        keluar dulu atau daftar dengan email tersebut.
                      </p>
                    )
                  ) : (
                    <>
                      <Button className="w-full" render={<Link href={`/signup?invite=${token}`} />}>
                        Daftar dengan email ini
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        render={<Link href={`/login?callbackUrl=/invite/${token}`} />}
                      >
                        Sudah punya akun? Masuk
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </ForceLight>
  );
}
