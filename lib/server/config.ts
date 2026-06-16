import "server-only";
import path from "node:path";

/** PostgreSQL connection string for the metadata store. */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the Postgres metadata store (see .env.example).",
    );
  }
  return url;
}

/** Absolute base directory where snapshot dump files are written. */
export function snapshotDir(): string {
  const dir = process.env.SNAPSHOT_DIR ?? "./snapshots";
  return path.resolve(dir);
}

/** Raw master secret used to derive the encryption key (optional — falls back
 *  to a generated keyfile under ~/.dbbs). */
export function masterSecret(): string | undefined {
  return process.env.DBBS_MASTER_KEY || undefined;
}

/** Optional explicit path to mysqldump / mysql binaries (set in Settings). */
export function mysqlBinDirOverride(): string | undefined {
  return process.env.DBBS_MYSQL_BIN_DIR || undefined;
}
