import { auth } from "@/auth";
import { redirect } from "next/navigation";

/** Ambil user id dari session; redirect ke login kalau tidak ada. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}
