import "server-only";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/server/store/client";
import { ensureMigrated } from "@/lib/server/store/migrate";
import { snapshots } from "@/lib/server/store/schema";
import type { JobStatus, Snapshot, SnapshotOptions } from "@/lib/types";

export async function listSnapshots(projectId?: string): Promise<Snapshot[]> {
  await ensureMigrated();
  const db = getDb();
  const q = db.select().from(snapshots);
  return projectId
    ? q.where(eq(snapshots.projectId, projectId)).orderBy(desc(snapshots.createdAt))
    : q.orderBy(desc(snapshots.createdAt));
}

export async function getSnapshot(id: string): Promise<Snapshot | null> {
  await ensureMigrated();
  const rows = await getDb().select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createSnapshot(input: {
  projectId: string;
  sourceConnectionId: string;
  sourceDatabase: string;
  name: string;
  filePath: string;
  compressed: boolean;
  options: SnapshotOptions;
}): Promise<Snapshot> {
  await ensureMigrated();
  const rows = await getDb()
    .insert(snapshots)
    .values({
      projectId: input.projectId,
      sourceConnectionId: input.sourceConnectionId,
      sourceDatabase: input.sourceDatabase,
      name: input.name,
      filePath: input.filePath,
      compressed: input.compressed,
      options: input.options,
      status: "running",
    })
    .returning();
  return rows[0];
}

export async function updateSnapshot(
  id: string,
  patch: Partial<{
    bytes: number;
    status: JobStatus;
    error: string | null;
    serverVersion: string | null;
    filePath: string;
  }>,
): Promise<void> {
  await ensureMigrated();
  await getDb().update(snapshots).set(patch).where(eq(snapshots.id, id));
}

export async function deleteSnapshot(id: string): Promise<void> {
  await ensureMigrated();
  await getDb().delete(snapshots).where(eq(snapshots.id, id));
}
