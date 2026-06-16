import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const pexec = promisify(execFile);

export interface PgBinaryInfo {
  path: string;
  version: string;
}

const CANDIDATE_DIRS = [
  "/usr/bin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/usr/lib/postgresql/17/bin",
  "/usr/lib/postgresql/16/bin",
  "/usr/lib/postgresql/15/bin",
  "/opt/homebrew/opt/postgresql@16/bin",
  "/opt/homebrew/opt/libpq/bin",
];

async function resolveBinaryPath(name: string): Promise<string | null> {
  try {
    const { stdout } = await pexec("which", [name]);
    const found = stdout.trim().split("\n")[0];
    if (found && fs.existsSync(found)) return found;
  } catch {
    // fall through to candidate dirs
  }
  for (const dir of CANDIDATE_DIRS) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const cache = new Map<string, PgBinaryInfo>();

async function find(name: string, force: boolean): Promise<PgBinaryInfo> {
  if (!force && cache.has(name)) return cache.get(name)!;
  const resolved = await resolveBinaryPath(name);
  if (!resolved) {
    throw new Error(`${name} binary not found. Install the PostgreSQL client tools.`);
  }
  const { stdout } = await pexec(resolved, ["--version"]);
  const info = { path: resolved, version: stdout.trim() };
  cache.set(name, info);
  return info;
}

export function findPgDump(force = false): Promise<PgBinaryInfo> {
  return find("pg_dump", force);
}

export function findPsql(force = false): Promise<PgBinaryInfo> {
  return find("psql", force);
}
