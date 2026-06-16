"use server";

import fsp from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSnapshot } from "@/lib/server/store/repos/snapshots";
import { createRestoreJob } from "@/lib/server/store/repos/jobs";
import { loadConnectionConfig } from "@/lib/server/db/connection-config";
import { getAdapter } from "@/lib/server/db/adapter";
import { assertInsideSnapshotDir } from "@/lib/server/paths";
import { createJob, abortJob } from "@/lib/server/jobs/manager";
import { runRestoreJob } from "@/lib/server/jobs/run-restore";
import { ok, fail, zodFieldErrors, type ActionResult } from "@/lib/actions/result";

const startSchema = z.object({
  snapshotId: z.string().uuid(),
  targetConnectionId: z.string().uuid(),
  targetDatabase: z
    .string()
    .trim()
    .min(1, "Target database is required")
    .max(120)
    .regex(/^[A-Za-z0-9_$-]+$/, "Use letters, numbers, _ - $ only"),
  mariadbCompat: z.boolean().default(true),
});

export async function startRestoreAction(input: {
  snapshotId: string;
  targetConnectionId: string;
  targetDatabase: string;
  mariadbCompat?: boolean;
}): Promise<ActionResult<{ jobId: string }>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));

  const snapshot = await getSnapshot(parsed.data.snapshotId);
  if (!snapshot) return fail("Snapshot not found");
  if (snapshot.status !== "completed") {
    return fail("Snapshot is not in a completed state");
  }

  try {
    assertInsideSnapshotDir(snapshot.filePath);
    await fsp.access(snapshot.filePath);
  } catch {
    return fail("Snapshot dump file is missing");
  }

  const loaded = await loadConnectionConfig(parsed.data.targetConnectionId);
  if (!loaded) return fail("Target connection not found");

  // Create the target database if it does not exist (A.test → B.other).
  try {
    const adapter = getAdapter(loaded.conn.engine);
    await adapter.ensureDatabase(loaded.cfg, parsed.data.targetDatabase);
  } catch (e) {
    return fail(
      e instanceof Error ? e.message : "Could not prepare the target database",
    );
  }

  const job = await createRestoreJob({
    snapshotId: snapshot.id,
    targetConnectionId: loaded.conn.id,
    targetDatabase: parsed.data.targetDatabase,
  });

  const signal = createJob(job.id, "restore");
  void runRestoreJob({
    jobId: job.id,
    engine: loaded.conn.engine,
    cfg: loaded.cfg,
    targetDatabase: parsed.data.targetDatabase,
    dumpPath: snapshot.filePath,
    compressed: snapshot.compressed,
    mariadbCompat: parsed.data.mariadbCompat,
    signal,
  });

  revalidatePath("/restore");
  return ok({ jobId: job.id });
}

export async function cancelRestoreAction(jobId: string): Promise<ActionResult> {
  abortJob(jobId);
  return ok(undefined);
}
