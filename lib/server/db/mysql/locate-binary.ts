import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { mysqlBinDirOverride } from "@/lib/server/config";

const pexec = promisify(execFile);

export type ClientKind = "mysql" | "mariadb" | "unknown";

export interface BinaryInfo {
  path: string;
  kind: ClientKind;
  version: string;
  majorMinor: [number, number] | null;
}

const CANDIDATE_DIRS = [
  "/usr/bin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/opt/mysql@8.0/bin",
  "/opt/homebrew/opt/mysql/bin",
  "/usr/local/mysql/bin",
];

async function resolveBinaryPath(name: string): Promise<string | null> {
  const override = mysqlBinDirOverride();
  try {
    const { stdout } = await pexec("which", [name]);
    const found = stdout.trim().split("\n")[0];
    if (found && fs.existsSync(found)) return found;
  } catch {
    // `which` may be absent or find nothing — fall through to candidate dirs.
  }
  const dirs = override ? [override, ...CANDIDATE_DIRS] : CANDIDATE_DIRS;
  for (const dir of dirs) {
    const candidate = path.join(dir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function inspect(binPath: string): Promise<BinaryInfo> {
  const { stdout } = await pexec(binPath, ["--version"]);
  const text = stdout.trim();
  const kind: ClientKind = /mariadb/i.test(text)
    ? "mariadb"
    : /mysql|distrib/i.test(text)
      ? "mysql"
      : "unknown";
  const m = text.match(/(\d+)\.(\d+)\.\d+/);
  return {
    path: binPath,
    kind,
    version: text,
    majorMinor: m ? [Number(m[1]), Number(m[2])] : null,
  };
}

const cache = new Map<string, BinaryInfo>();

async function find(name: string, force: boolean): Promise<BinaryInfo> {
  if (!force && cache.has(name)) return cache.get(name)!;
  const resolved = await resolveBinaryPath(name);
  if (!resolved) {
    throw new Error(
      `${name} binary not found. Install MySQL client tools or set DBBS_MYSQL_BIN_DIR.`,
    );
  }
  const info = await inspect(resolved);
  cache.set(name, info);
  return info;
}

export function findMysqldump(force = false): Promise<BinaryInfo> {
  return find("mysqldump", force);
}

export function findMysql(force = false): Promise<BinaryInfo> {
  return find("mysql", force);
}

/** Non-throwing probe for the Settings page. */
export async function probeBinaries(): Promise<{
  mysqldump: BinaryInfo | null;
  mysql: BinaryInfo | null;
}> {
  const safe = async (fn: () => Promise<BinaryInfo>) => {
    try {
      return await fn();
    } catch {
      return null;
    }
  };
  const [dump, cli] = await Promise.all([
    safe(() => findMysqldump(true)),
    safe(() => findMysql(true)),
  ]);
  return { mysqldump: dump, mysql: cli };
}
