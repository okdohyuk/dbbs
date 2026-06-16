import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/server/store/client";
import { ensureMigrated } from "@/lib/server/store/migrate";
import { restoreJobs } from "@/lib/server/store/schema";
import type { JobStatus, RestoreJob } from "@/lib/types";

export async function listRestoreJobs(limit = 50): Promise<RestoreJob[]> {
  await ensureMigrated();
  return getDb()
    .select()
    .from(restoreJobs)
    .orderBy(desc(restoreJobs.startedAt))
    .limit(limit);
}

export async function getRestoreJob(id: string): Promise<RestoreJob | null> {
  await ensureMigrated();
  const rows = await getDb()
    .select()
    .from(restoreJobs)
    .where(eq(restoreJobs.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createRestoreJob(input: {
  snapshotId: string;
  targetConnectionId: string;
  targetDatabase: string;
}): Promise<RestoreJob> {
  await ensureMigrated();
  const rows = await getDb()
    .insert(restoreJobs)
    .values({
      snapshotId: input.snapshotId,
      targetConnectionId: input.targetConnectionId,
      targetDatabase: input.targetDatabase,
      status: "running",
    })
    .returning();
  return rows[0];
}

export async function updateRestoreJob(
  id: string,
  patch: Partial<{
    status: JobStatus;
    error: string | null;
    logTail: string | null;
    finishedAt: Date | null;
  }>,
): Promise<void> {
  await ensureMigrated();
  await getDb().update(restoreJobs).set(patch).where(eq(restoreJobs.id, id));
}
