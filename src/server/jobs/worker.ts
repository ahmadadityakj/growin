/**
 * Background worker — proses job dari pg-boss queue.
 * Jalankan terpisah dari Next.js: `npm run worker`
 */
import "dotenv/config";
import { PgBoss } from "pg-boss";
import { QUEUES } from "./queue";
import { ResearchService } from "../services/research-service";
import { TaskService } from "../services/task-service";

async function main() {
  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();

  for (const q of Object.values(QUEUES)) {
    await boss.createQueue(q).catch(() => {});
  }

  await boss.work<{ jobId: string }>(QUEUES.researchExecute, async (jobs) => {
    for (const job of jobs) {
      console.log(`[worker] research.execute ${job.data.jobId}`);
      await ResearchService.execute(job.data.jobId);
    }
  });

  await boss.work<{ taskId: string }>(QUEUES.taskExecute, async (jobs) => {
    for (const job of jobs) {
      console.log(`[worker] ai-task.execute ${job.data.taskId}`);
      await TaskService.execute(job.data.taskId);
    }
  });

  await boss.work<{ messageId: string }>(QUEUES.messageSend, async (jobs) => {
    const { OutreachService } = await import("../services/outreach-service");
    for (const job of jobs) {
      console.log(`[worker] outreach.send ${job.data.messageId}`);
      await OutreachService.sendMessage(job.data.messageId);
    }
  });

  await boss.work(QUEUES.followupTick, async () => {
    const { FollowUpService } = await import("../services/followup-service");
    console.log("[worker] followup.tick");
    const r = await FollowUpService.tick();
    console.log(`[worker] followup.tick done:`, r);
  });

  // jalankan follow-up tick tiap 15 menit
  await boss.schedule(QUEUES.followupTick, "*/15 * * * *");

  console.log("[worker] Growin worker started, listening for jobs...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
