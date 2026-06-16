import "server-only";
import type { DbAdapter } from "@/lib/server/db/adapter";
import * as meta from "./meta-client";
import { runPgDump } from "./pg-dump";
import { runPgRestore } from "./pg-restore";

export const postgresAdapter: DbAdapter = {
  engine: "postgresql",
  testConnection: meta.testConnection,
  listDatabases: meta.listDatabases,
  listTables: meta.listTables,
  ensureDatabase: meta.ensureDatabase,

  async createSnapshot({ cfg, database, outPath, options, onProgress, signal }) {
    const test = await meta.testConnection(cfg);
    const result = await runPgDump({ cfg, database, outPath, options, onProgress, signal });
    return { ...result, serverVersion: test.serverVersion ?? null };
  },

  async restoreSnapshot({ cfg, targetDatabase, dumpPath, compressed, onProgress, signal }) {
    // mariadbCompat is MySQL-only and ignored for PostgreSQL.
    await runPgRestore({ cfg, targetDatabase, dumpPath, compressed, onProgress, signal });
  },
};
