import "server-only";
import type { DbAdapter } from "@/lib/server/db/adapter";
import * as meta from "./meta-client";
import { runMysqldump } from "./mysqldump";
import { runMysqlRestore } from "./mysql-restore";

export const mysqlAdapter: DbAdapter = {
  engine: "mysql",
  testConnection: meta.testConnection,
  listDatabases: meta.listDatabases,
  listTables: meta.listTables,
  ensureDatabase: meta.ensureDatabase,

  async createSnapshot({ cfg, database, outPath, options, onProgress, signal }) {
    const test = await meta.testConnection(cfg);
    const result = await runMysqldump({ cfg, database, outPath, options, onProgress, signal });
    return { ...result, serverVersion: test.serverVersion ?? null };
  },

  async restoreSnapshot(args) {
    await runMysqlRestore(args);
  },
};
