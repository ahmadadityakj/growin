import { PgBoss } from "pg-boss";

export const QUEUES = {
  researchExecute: "research.execute",
  taskExecute: "ai-task.execute",
  messageSend: "outreach.send",
  followupTick: "followup.tick",
} as const;

const ALL_QUEUES = Object.values(QUEUES);

const globalForBoss = globalThis as unknown as { __pgboss?: PgBoss };

export async function getBoss(): Promise<PgBoss> {
  if (!globalForBoss.__pgboss) {
    const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
    boss.on("error", (err) => console.error("[pg-boss]", err));
    await boss.start();
    for (const q of ALL_QUEUES) {
      await boss.createQueue(q).catch(() => {});
    }
    globalForBoss.__pgboss = boss;
  }
  return globalForBoss.__pgboss;
}

export async function enqueue(queue: string, data: Record<string, unknown>, options?: { startAfter?: number }) {
  const boss = await getBoss();
  if (options?.startAfter) {
    return boss.sendAfter(queue, data, {}, options.startAfter);
  }
  return boss.send(queue, data, { retryLimit: 2, retryBackoff: true });
}
