import "server-only";
import type {
  Engine,
  TableInfo,
  ConnectionTestResult,
  SnapshotOptions,
  ProgressEvent,
} from "@/lib/types";

/** Raw connection parameters (server-only — carries the decrypted password). */
export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
}

export type ProgressHandler = (event: ProgressEvent) => void;

export interface DbAdapter {
  readonly engine: Engine;

  testConnection(cfg: ConnectionConfig): Promise<ConnectionTestResult>;
  listDatabases(cfg: ConnectionConfig): Promise<string[]>;
  listTables(cfg: ConnectionConfig, database: string): Promise<TableInfo[]>;

  /** Create the target database if it does not exist (used before restore). */
  ensureDatabase(cfg: ConnectionConfig, database: string): Promise<void>;

  createSnapshot(args: {
    cfg: ConnectionConfig;
    database: string;
    outPath: string;
    options: SnapshotOptions;
    onProgress: ProgressHandler;
    signal: AbortSignal;
  }): Promise<{ filePath: string; bytes: number; serverVersion: string | null }>;

  restoreSnapshot(args: {
    cfg: ConnectionConfig;
    targetDatabase: string;
    dumpPath: string;
    compressed: boolean;
    /** Rewrite MariaDB-only syntax (sysdate()/current_timestamp() defaults) for MySQL. */
    mariadbCompat: boolean;
    onProgress: ProgressHandler;
    signal: AbortSignal;
  }): Promise<void>;
}

import { mysqlAdapter } from "@/lib/server/db/mysql/adapter";
import { engineLabel } from "@/lib/engines";

export function getAdapter(engine: Engine): DbAdapter {
  // MySQL and MariaDB share the mysqldump/mysql tooling.
  if (engine === "mysql" || engine === "mariadb") return mysqlAdapter;
  throw new Error(`${engineLabel(engine)} is not supported yet`);
}
