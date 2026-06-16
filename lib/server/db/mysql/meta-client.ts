import "server-only";
import mysql from "mysql2/promise";
import type { ConnectionConfig } from "@/lib/server/db/adapter";
import type { TableInfo, ConnectionTestResult } from "@/lib/types";

const CONNECT_TIMEOUT_MS = 8000;

const SYSTEM_DATABASES = new Set([
  "information_schema",
  "performance_schema",
  "mysql",
  "sys",
]);

async function withConnection<T>(
  cfg: ConnectionConfig,
  fn: (conn: mysql.Connection) => Promise<T>,
): Promise<T> {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectTimeout: CONNECT_TIMEOUT_MS,
    multipleStatements: false,
  });
  try {
    return await fn(conn);
  } finally {
    await conn.end().catch(() => {});
  }
}

function describeError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code?: string }).code;
    const message = (e as { message?: string }).message ?? "Connection failed";
    return code ? `${code}: ${message}` : message;
  }
  return e instanceof Error ? e.message : "Connection failed";
}

export async function testConnection(
  cfg: ConnectionConfig,
): Promise<ConnectionTestResult> {
  try {
    // Test without a target database so it succeeds even before one is chosen.
    const { database: _ignored, ...rest } = cfg;
    void _ignored;
    return await withConnection(rest, async (conn) => {
      const [rows] = await conn.query<mysql.RowDataPacket[]>("SELECT VERSION() AS v");
      return { ok: true, serverVersion: rows[0]?.v as string | undefined };
    });
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function listDatabases(cfg: ConnectionConfig): Promise<string[]> {
  const { database: _ignored, ...rest } = cfg;
  void _ignored;
  return withConnection(rest, async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>("SHOW DATABASES");
    return rows
      .map((r) => r.Database as string)
      .filter((db) => !SYSTEM_DATABASES.has(db));
  });
}

export async function listTables(
  cfg: ConnectionConfig,
  database: string,
): Promise<TableInfo[]> {
  return withConnection({ ...cfg, database }, async (conn) => {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT table_name AS name,
              table_rows AS row_count,
              (COALESCE(data_length,0) + COALESCE(index_length,0)) AS size_bytes,
              engine AS engine
         FROM information_schema.tables
        WHERE table_schema = ? AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
      [database],
    );
    return rows.map((r) => ({
      name: r.name as string,
      rows: r.row_count === null ? null : Number(r.row_count),
      sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
      engine: (r.engine as string | null) ?? null,
    }));
  });
}

const VALID_IDENTIFIER = /^[A-Za-z0-9_$-]{1,120}$/;

/** Create a database if it does not exist. Identifier is strictly validated. */
export async function ensureDatabase(
  cfg: ConnectionConfig,
  database: string,
): Promise<void> {
  if (!VALID_IDENTIFIER.test(database)) {
    throw new Error(`Invalid database name: ${database}`);
  }
  const { database: _ignored, ...rest } = cfg;
  void _ignored;
  // Validated above; also double any backticks as defense-in-depth before quoting.
  const quoted = database.replace(/`/g, "``");
  await withConnection(rest, async (conn) => {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${quoted}\` CHARACTER SET utf8mb4`);
  });
}
