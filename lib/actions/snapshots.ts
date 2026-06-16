"use server";

import fsp from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSnapshot,
  getSnapshot,
  deleteSnapshot,
} from "@/lib/server/store/repos/snapshots";
import { loadConnectionConfig } from "@/lib/server/db/connection-config";
import { buildSnapshotPath, assertInsideSnapshotDir } from "@/lib/server/paths";
import { createJob, abortJob } from "@/lib/server/jobs/manager";
import { runSnapshotJob } from "@/lib/server/jobs/run-snapshot";
import { ok, fail, zodFieldErrors, type ActionResult } from "@/lib/actions/result";

const optionsSchema = z.object({
  mode: z.enum(["full", "data-only", "schema-only"]),
  routines: z.boolean(),
  triggers: z.boolean(),
  events: z.boolean(),
  addDropTable: z.boolean(),
  singleTransaction: z.boolean(),
  compress: z.boolean(),
});

const startSchema = z.object({
  connectionId: z.string().uuid(),
  database: z.string().trim().min(1, "Pick a database").max(120),
  name: z.string().trim().min(1, "Name is required").max(120),
  options: optionsSchema,
});

export async function startSnapshotAction(input: {
  connectionId: string;
  database: string;
  name: string;
  options: z.infer<typeof optionsSchema>;
}): Promise<ActionResult<{ snapshotId: string }>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input", zodFieldErrors(parsed.error));

  const loaded = await loadConnectionConfig(parsed.data.connectionId, parsed.data.database);
  if (!loaded) return fail("Connection not found");

  const compress = parsed.data.options.compress;
  let outPath: string;
  try {
    outPath = buildSnapshotPath(parsed.data.name, parsed.data.database, compress);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Invalid snapshot path");
  }

  const snapshot = await createSnapshot({
    projectId: loaded.conn.projectId,
    sourceConnectionId: loaded.conn.id,
    sourceDatabase: parsed.data.database,
    name: parsed.data.name,
    filePath: outPath,
    compressed: compress,
    options: parsed.data.options,
  });

  const signal = createJob(snapshot.id, "snapshot");
  // Fire-and-forget: the job updates the DB + streams progress over SSE.
  void runSnapshotJob({
    snapshotId: snapshot.id,
    engine: loaded.conn.engine,
    cfg: loaded.cfg,
    database: parsed.data.database,
    outPath,
    options: parsed.data.options,
    signal,
  });

  revalidatePath("/snapshots");
  return ok({ snapshotId: snapshot.id });
}

export async function cancelSnapshotAction(snapshotId: string): Promise<ActionResult> {
  abortJob(snapshotId);
  return ok(undefined);
}

export async function deleteSnapshotAction(snapshotId: string): Promise<ActionResult> {
  try {
    const snap = await getSnapshot(snapshotId);
    if (snap) {
      try {
        assertInsideSnapshotDir(snap.filePath);
        await fsp.rm(snap.filePath, { force: true }).catch(() => {});
      } catch {
        // path outside snapshot dir — leave the file, just drop the record
      }
    }
    await deleteSnapshot(snapshotId);
    revalidatePath("/snapshots");
    revalidatePath("/restore");
    return ok(undefined);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to delete snapshot");
  }
}
