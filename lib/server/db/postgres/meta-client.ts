import "server-only";
import postgres from "postgres";
import type { ConnectionConfig } from "@/lib/server/db/adapter";
import type { TableInfo, ConnectionTestResult } from "@/lib/types";

const CONNECT_TIMEOUT_S = 8;

function client(cfg: ConnectionConfig, database: string) {
  return postgres({
    host: cfg.host,
    port: cfg.port,
    username: cfg.user,
    password: cfg.password,
    database,
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_S,
    idle_timeout: 2,
    prepare: false,
    onnotice: () => {},
  });
}

async function withPg<T>(
  cfg: ConnectionConfig,
  database: string,
  fn: (sql: ReturnType<typeof client>) => Promise<T>,
): Promise<T> {
  const sql = client(cfg, database);
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
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
  const database = cfg.database || "postgres";
  try {
    return await withPg(cfg, database, async (sql) => {
      const rows = await sql<{ v: string }[]>`SELECT version() AS v`;
      const full = rows[0]?.v ?? "";
      const m = /PostgreSQL\s+([0-9.]+)/i.exec(full);
      return { ok: true, serverVersion: m ? `PostgreSQL ${m[1]}` : full };
    });
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

export async function listDatabases(cfg: ConnectionConfig): Promise<string[]> {
  return withPg(cfg, cfg.database || "postgres", async (sql) => {
    const rows = await sql<{ datname: string }[]>`
      SELECT datname FROM pg_database
      WHERE datistemplate = false AND datallowconn = true
      ORDER BY datname`;
    return rows.map((r) => r.datname);
  });
}

export async function listTables(
  cfg: ConnectionConfig,
  database: string,
): Promise<TableInfo[]> {
  return withPg(cfg, database, async (sql) => {
    const rows = await sql<
      { name: string; row_estimate: string | number; size_bytes: string | number | null }[]
    >`
      SELECT c.relname AS name,
             c.reltuples::bigint AS row_estimate,
             pg_total_relation_size(c.oid) AS size_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND n.nspname !~ '^pg_'
      ORDER BY c.relname`;
    return rows.map((r) => {
      const est = Number(r.row_estimate);
      return {
        name: r.name,
        rows: est < 0 ? null : est,
        sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
        engine: null,
      };
    });
  });
}

const VALID_IDENTIFIER = /^[A-Za-z0-9_$-]{1,120}$/;

/** Create the target database if it does not exist (PostgreSQL has no IF NOT EXISTS). */
export async function ensureDatabase(
  cfg: ConnectionConfig,
  database: string,
): Promise<void> {
  if (!VALID_IDENTIFIER.test(database)) {
    throw new Error(`Invalid database name: ${database}`);
  }
  await withPg(cfg, cfg.database || "postgres", async (sql) => {
    const exists = await sql`SELECT 1 FROM pg_database WHERE datname = ${database}`;
    if (exists.length === 0) {
      const quoted = database.replace(/"/g, '""');
      await sql.unsafe(`CREATE DATABASE "${quoted}"`);
    }
  });
}
