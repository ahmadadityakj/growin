import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeamService } from "@/server/services/team-service";

/**
 * Scope data efektif: user id sendiri, atau id owner workspace
 * kalau user adalah member. Semua query data memakai nilai ini.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return TeamService.resolveScope(id);
}
