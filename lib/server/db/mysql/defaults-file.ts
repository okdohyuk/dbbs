import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { ConnectionConfig } from "@/lib/server/db/adapter";

function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Write a 0600 my.cnf so credentials are passed to mysqldump/mysql via
 * --defaults-extra-file instead of argv (keeps them out of `ps` output).
 * Caller must remove it with {@link removeDefaultsFile}.
 */
export async function writeDefaultsFile(cfg: ConnectionConfig): Promise<string> {
  const file = path.join(os.tmpdir(), `dbbs-${randomBytes(8).toString("hex")}.cnf`);
  const content =
    `[client]\n` +
    `host="${esc(cfg.host)}"\n` +
    `port=${cfg.port}\n` +
    `user="${esc(cfg.user)}"\n` +
    `password="${esc(cfg.password)}"\n`;
  await fs.writeFile(file, content, { mode: 0o600 });
  return file;
}

export async function removeDefaultsFile(file: string): Promise<void> {
  await fs.rm(file, { force: true }).catch(() => {});
}
