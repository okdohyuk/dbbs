import "server-only";
import path from "node:path";
import { snapshotDir } from "@/lib/server/config";

export function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "snapshot"
  );
}

/** Resolve a safe, unique dump path inside SNAPSHOT_DIR. */
export function buildSnapshotPath(
  name: string,
  database: string,
  compress: boolean,
  now: Date = new Date(),
): string {
  const ts = now.toISOString().replace(/[:.]/g, "-");
  const file = `${slug(name)}__${slug(database)}__${ts}.sql${compress ? ".gz" : ""}`;
  const base = path.resolve(snapshotDir());
  const resolved = path.resolve(path.join(base, file));
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("Invalid snapshot path");
  }
  return resolved;
}

/** Guard that a stored dump path is within SNAPSHOT_DIR before reading it. */
export function assertInsideSnapshotDir(p: string): void {
  const base = path.resolve(snapshotDir());
  const resolved = path.resolve(p);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("Path is outside the snapshot directory");
  }
}
