import "server-only";
import { getAdapter } from "@/lib/server/db/adapter";
import type { ConnectionConfig } from "@/lib/server/db/adapter";
import { emit, finishJob } from "@/lib/server/jobs/manager";
import { describeJobError } from "@/lib/server/jobs/job-error";
import { updateRestoreJob } from "@/lib/server/store/repos/jobs";
import type { Engine } from "@/lib/types";

/** Run a restore in the background, streaming progress + persisting state. */
export async function runRestoreJob(args: {
  jobId: string;
  engine: Engine;
  cfg: ConnectionConfig;
  targetDatabase: string;
  dumpPath: string;
  compressed: boolean;
  mariadbCompat: boolean;
  signal: AbortSignal;
}): Promise<void> {
  const { jobId, engine, cfg, targetDatabase, dumpPath, compressed, mariadbCompat, signal } =
    args;
  try {
    const adapter = getAdapter(engine);
    await adapter.restoreSnapshot({
      cfg,
      targetDatabase,
      dumpPath,
      compressed,
      mariadbCompat,
      onProgress: (e) => emit(jobId, e),
      signal,
    });
    await updateRestoreJob(jobId, { status: "completed", finishedAt: new Date() });
    finishJob(jobId, "completed");
  } catch (e) {
    const message = describeJobError(e, "Restore failed");
    await updateRestoreJob(jobId, {
      status: "failed",
      error: message,
      logTail: message,
      finishedAt: new Date(),
    });
    finishJob(jobId, "failed", message);
  }
}
