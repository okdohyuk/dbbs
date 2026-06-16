import "server-only";
import type { SnapshotOptions } from "@/lib/types";
import type { BinaryInfo } from "@/lib/server/db/mysql/locate-binary";

/**
 * Build the mysqldump argv for a single-database dump.
 *
 * Single-DB mode (`mysqldump <db>` rather than `--databases <db>`) omits
 * CREATE DATABASE / USE statements, so the dump can be restored into a
 * differently-named database on another server (A.test → B.other).
 */
export function buildDumpArgs(
  options: SnapshotOptions,
  database: string,
  bin: BinaryInfo,
  defaultsFile: string,
): string[] {
  const args = [`--defaults-extra-file=${defaultsFile}`];

  // Portability / safety flags (compatible with both clients).
  args.push("--default-character-set=utf8mb4", "--hex-blob", "--no-tablespaces");

  if (options.singleTransaction) args.push("--single-transaction");

  // Oracle MySQL-only flags. MariaDB's mysqldump rejects these as unknown.
  if (bin.kind === "mysql") {
    args.push("--skip-column-statistics", "--set-gtid-purged=OFF");
  }

  // Content mode.
  if (options.mode === "data-only") args.push("--no-create-info");
  if (options.mode === "schema-only") args.push("--no-data");
  if (options.addDropTable && options.mode !== "data-only") {
    args.push("--add-drop-table");
  }

  if (options.routines) args.push("--routines");
  args.push(options.triggers ? "--triggers" : "--skip-triggers");
  if (options.events) args.push("--events");

  // Target database (+ optional specific tables) last.
  args.push(database);
  if (options.tables && options.tables.length > 0) {
    args.push(...options.tables);
  }

  return args;
}

/** Build the `mysql` client argv used to stream a dump back into a database. */
export function buildRestoreArgs(targetDatabase: string, defaultsFile: string): string[] {
  return [
    `--defaults-extra-file=${defaultsFile}`,
    "--default-character-set=utf8mb4",
    `--database=${targetDatabase}`,
  ];
}
