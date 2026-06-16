// Runs once when the Next.js server process boots (Node runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureMigrated } = await import("@/lib/server/store/migrate");
    const { reconcileInterruptedJobs } = await import("@/lib/server/jobs/recover");
    await ensureMigrated();
    // Any job left "running" from a previous process is no longer tracked.
    await reconcileInterruptedJobs();
  }
}
