"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TeamService } from "@/server/services/team-service";
import { TaskService } from "@/server/services/task-service";
import { enqueue, QUEUES } from "@/server/jobs/queue";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function createTask(instruction: string) {
  const session = await requireAuth();
  const task = await TaskService.create(instruction, session.user.id);
  await enqueue(QUEUES.taskExecute, { taskId: task.id });
  revalidatePath("/tasks");
  return task.id;
}
