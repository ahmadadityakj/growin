import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    await db.execute(sql`select 1`);
    const release = await readFile(path.join(process.cwd(), ".release-id"), "utf8")
      .then((v) => v.trim())
      .catch(() => "development");
    return Response.json({ ok: true, release }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
