import "server-only";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { getDb } from "./client";

const g = globalThis as unknown as { __dbbsMigrated?: Promise<void> };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runWithRetry(): Promise<void> {
  const folder = path.join(process.cwd(), "lib/server/store/migrations");
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await migrate(getDb(), { migrationsFolder: folder });
      return;
    } catch (err) {
      lastErr = err;
      // Postgres may still be starting up — back off and retry.
      await sleep(Math.min(attempt * 1000, 5000));
    }
  }
  throw lastErr;
}

/** Apply pending migrations exactly once per server process. */
export function ensureMigrated(): Promise<void> {
  if (!g.__dbbsMigrated) {
    g.__dbbsMigrated = runWithRetry();
  }
  return g.__dbbsMigrated;
}
