// Shared domain types for dbbs. Safe to import from both server and client
// (no secrets, no node-only imports here).

export type Engine =
  | "mysql"
  | "mariadb"
  | "postgresql"
  | "mongodb"
  | "sqlserver"
  | "oracle"
  | "sqlite"
  | "redis"
  | "elasticsearch"
  | "db2";

export type SnapshotMode = "full" | "data-only" | "schema-only";

export interface SnapshotOptions {
  /** full = schema + data; data-only = --no-create-info; schema-only = --no-data */
  mode: SnapshotMode;
  /** include stored procedures + functions (--routines) */
  routines: boolean;
  /** include triggers (--triggers) */
  triggers: boolean;
  /** include scheduled events (--events) */
  events: boolean;
  /** prepend DROP TABLE statements (--add-drop-table) */
  addDropTable: boolean;
  /** consistent InnoDB snapshot (--single-transaction) */
  singleTransaction: boolean;
  /** gzip the dump on disk */
  compress: boolean;
  /** specific tables only; empty/undefined = whole database */
  tables?: string[];
}

export const DEFAULT_SNAPSHOT_OPTIONS: SnapshotOptions = {
  mode: "full",
  routines: true,
  triggers: true,
  events: false,
  addDropTable: true,
  singleTransaction: true,
  compress: true,
};

export type JobStatus = "running" | "completed" | "failed" | "interrupted";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  projectId: string;
  name: string;
  engine: Engine;
  host: string;
  port: number;
  user: string;
  /** AES-256-GCM ciphertext — never sent to the client. */
  passwordEnc: string;
  defaultDatabase: string | null;
  lastTestedAt: Date | null;
  lastServerVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Connection without the secret, plus a flag indicating a password is set. */
export type ConnectionPublic = Omit<Connection, "passwordEnc"> & {
  hasPassword: boolean;
};

export interface Snapshot {
  id: string;
  projectId: string;
  /** Null for snapshots imported from an uploaded .sql file. */
  sourceConnectionId: string | null;
  sourceDatabase: string;
  name: string;
  filePath: string;
  bytes: number;
  compressed: boolean;
  options: SnapshotOptions;
  status: JobStatus;
  error: string | null;
  serverVersion: string | null;
  createdAt: Date;
}

export interface RestoreJob {
  id: string;
  snapshotId: string;
  targetConnectionId: string;
  targetDatabase: string;
  status: JobStatus;
  error: string | null;
  logTail: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface TableInfo {
  name: string;
  rows: number | null;
  sizeBytes: number | null;
  engine: string | null;
}

export interface ConnectionTestResult {
  ok: boolean;
  serverVersion?: string;
  error?: string;
}

/** Streamed progress for long-running dump / restore jobs. */
export interface ProgressEvent {
  type: "start" | "progress" | "log" | "done" | "error";
  bytesWritten?: number;
  message?: string;
}
