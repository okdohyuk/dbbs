import postgres from "postgres";
import mysql from "mysql2/promise";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Reset all state so the E2E flow is deterministic across re-runs. */
export default async function globalSetup() {
  // 1) Wipe metadata store (cascades to connections/snapshots/restore_jobs).
  const sql = postgres(
    process.env.DATABASE_URL ?? "postgres://dbbs:dbbs@localhost:5432/dbbs",
  );
  try {
    await sql`TRUNCATE projects RESTART IDENTITY CASCADE`;
  } catch {
    /* tables may not exist on a very first run */
  } finally {
    await sql.end({ timeout: 5 });
  }

  // 2) Drop the restore target database on mysql-b (exposed on :3308).
  try {
    const conn = await mysql.createConnection({
      host: "127.0.0.1",
      port: 3308,
      user: "root",
      password: "root",
    });
    await conn.query("DROP DATABASE IF EXISTS restored_db");
    await conn.query("DROP DATABASE IF EXISTS uploaded_restored");
    await conn.query("DROP DATABASE IF EXISTS maria_restored");
    await conn.query("DROP DATABASE IF EXISTS compat_restored");
    await conn.end();
  } catch {
    /* mysql-b may not be reachable yet — non-fatal */
  }

  // 3) Drop the restore target database on pg-a (exposed on :5433).
  try {
    const pg = postgres({
      host: "127.0.0.1",
      port: 5433,
      username: "postgres",
      password: "postgres",
      database: "postgres",
      max: 1,
      connect_timeout: 8,
      prepare: false,
      onnotice: () => {},
    });
    try {
      await pg.unsafe("DROP DATABASE IF EXISTS pg_restored WITH (FORCE)");
      await pg.unsafe("DROP DATABASE IF EXISTS mysql_into_pg WITH (FORCE)");
    } finally {
      await pg.end({ timeout: 5 });
    }
  } catch {
    /* pg-a may not be reachable yet — non-fatal */
  }

  // 4) Clear old dump files.
  const dir = path.resolve(__dirname, "../../snapshots");
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".sql") || f.endsWith(".sql.gz")) {
        rmSync(path.join(dir, f), { force: true });
      }
    }
  } catch {
    /* dir may be empty/missing */
  }
}
