import { Users, Mail, Clock } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamService } from "@/server/services/team-service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { InviteForm, MemberRow, InviteRow, LeaveButton } from "./team-panel";

export const metadata = { title: "Pengaturan | Growin" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await TeamService.getMembership(session.user.id);

  if (membership) {
    return (
      <div>
        <PageHeader title={t.nav.settings} description="Workspace & tim" />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Workspace Anda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anda adalah member workspace milik{" "}
              <span className="font-medium text-foreground">
                {membership.ownerName ?? membership.ownerEmail}
              </span>
              . Semua data yang Anda lihat dan kelola adalah milik workspace tersebut.
            </p>
            <LeaveButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [members, invites] = await Promise.all([
    TeamService.listMembers(session.user.id),
    TeamService.listInvites(session.user.id),
  ]);

  return (
    <div>
      <PageHeader title={t.nav.settings} description="Workspace & tim" />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Undang member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Masukkan email rekan Anda, lalu kirim link undangan yang muncul lewat WhatsApp atau
              email. Mereka akan membuat akun sendiri dan langsung bergabung ke workspace ini.
            </p>
            <InviteForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Member ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada member. Undang rekan lewat form di atas.
              </p>
            ) : (
              <ul className="divide-y">
                {members.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {invites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Undangan terkirim
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {invites.map((i) => (
                  <InviteRow key={i.id} invite={i} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
