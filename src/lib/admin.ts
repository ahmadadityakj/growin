import { env } from "@/lib/env";

/**
 * Admin platform = email yang tercantum di PLATFORM_ADMIN_EMAILS.
 * Berbeda dengan users.role ("admin" = owner workspace), yang berlaku
 * untuk SEMUA user standalone — bukan penanda admin platform.
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
