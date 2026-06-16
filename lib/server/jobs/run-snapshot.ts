import "server-only";
import fsp from "node:fs/promises";
import { getAdapter } from "@/lib/server/db/adapter";
import type { ConnectionConfig } from "@/lib/server/db/adapter";
import { emit, finishJob } from "@/lib/server/jobs/manager";
import { updateSnapshot } from "@/lib/server/store/repos/snapshots";
import type { Engine, SnapshotOptions } from "@/lib/types";

/** Run a snapshot dump in the background, streaming progress + persisting state. */
export async function runSnapshotJob(args: {
  snapshotId: string;
  engine: Engine;
  cfg: ConnectionConfig;
  database: string;
  outPath: string;
  options: SnapshotOptions;
  signal: AbortSignal;
}): Promise<void> {
  const { snapshotId, engine, cfg, database, outPath, options, signal } = args;
  try {
    const adapter = getAdapter(engine);
    const res = await adapter.createSnapshot({
      cfg,
      database,
      outPath,
      options,
      onProgress: (e) => emit(snapshotId, e),
      signal,
    });
    await updateSnapshot(snapshotId, {
      status: "completed",
      bytes: res.bytes,
      serverVersion: res.serverVersion,
      filePath: res.filePath,
    });
    finishJob(snapshotId, "completed");
  } catch (e) {
    const message = e instanceof Error ? e.message : "Snapshot failed";
    await fsp.rm(outPath, { force: true }).catch(() => {});
    await updateSnapshot(snapshotId, { status: "failed", error: message });
    finishJob(snapshotId, "failed", message);
  }
}
