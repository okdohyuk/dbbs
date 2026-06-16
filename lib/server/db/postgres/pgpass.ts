import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { ConnectionConfig } from "@/lib/server/db/adapter";

// In a .pgpass line, ':' and '\' inside a field must be backslash-escaped.
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
}

/** Write a 0600 PGPASSFILE so pg_dump/psql authenticate without argv/env exposure. */
export async function writePgpass(cfg: ConnectionConfig): Promise<string> {
  const file = path.join(os.tmpdir(), `dbbs-${randomBytes(8).toString("hex")}.pgpass`);
  const line = `${esc(cfg.host)}:${cfg.port}:*:${esc(cfg.user)}:${esc(cfg.password)}\n`;
  await fs.writeFile(file, line, { mode: 0o600 });
  return file;
}

export async function removePgpass(file: string): Promise<void> {
  await fs.rm(file, { force: true }).catch(() => {});
}
