import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/server/store/client";
import { snapshots, restoreJobs } from "@/lib/server/store/schema";

/** A new process can no longer track jobs left "running" by the previous one.
 *  Mark them interrupted so the UI doesn't show forever-spinning work. */
export async function reconcileInterruptedJobs(): Promise<void> {
  const db = getDb();
  await db
    .update(snapshots)
    .set({ status: "interrupted", error: "Server restarted while running" })
    .where(eq(snapshots.status, "running"));
  await db
    .update(restoreJobs)
    .set({
      status: "interrupted",
      error: "Server restarted while running",
      finishedAt: new Date(),
    })
    .where(eq(restoreJobs.status, "running"));
}
