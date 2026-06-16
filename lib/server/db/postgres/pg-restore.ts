import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import zlib from "node:zlib";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ConnectionConfig, ProgressHandler } from "@/lib/server/db/adapter";
import { findPsql } from "./locate-binary";
import { writePgpass, removePgpass } from "./pgpass";
import { pgRestoreCompatTransform } from "./pg-compat";

export async function runPgRestore(args: {
  cfg: ConnectionConfig;
  targetDatabase: string;
  dumpPath: string;
  compressed: boolean;
  onProgress: ProgressHandler;
  signal: AbortSignal;
}): Promise<void> {
  const { cfg, targetDatabase, dumpPath, compressed, onProgress, signal } = args;
  const bin = await findPsql();
  const passfile = await writePgpass(cfg);
  const psqlArgs = [
    "--host",
    cfg.host,
    "--port",
    String(cfg.port),
    "--username",
    cfg.user,
    "--no-password",
    "--dbname",
    targetDatabase,
    "-v",
    "ON_ERROR_STOP=1",
    "--quiet",
  ];
  onProgress({ type: "start", message: `Restoring into ${targetDatabase}` });

  const child = spawn(bin.path, psqlArgs, {
    signal,
    env: { ...process.env, PGPASSFILE: passfile },
  });
  const input = fs.createReadStream(dumpPath);

  let fed = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      fed += chunk.length;
      onProgress({ type: "progress", bytesWritten: fed });
      cb(null, chunk);
    },
  });

  let stderr = "";
  child.stderr!.on("data", (d: Buffer) => {
    const s = d.toString();
    stderr += s;
    if (stderr.length > 8000) stderr = stderr.slice(-8000);
    onProgress({ type: "log", message: s.trim() });
  });

  const exited = new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? -1));
  });

  try {
    const steps: (
      | NodeJS.ReadableStream
      | NodeJS.ReadWriteStream
      | NodeJS.WritableStream
    )[] = [input];
    if (compressed) steps.push(zlib.createGunzip());
    steps.push(pgRestoreCompatTransform(), counter, child.stdin!);
    await pipeline(steps);
    const code = await exited;
    if (code !== 0) {
      throw new Error(`psql restore exited with code ${code}: ${stderr.slice(-600).trim()}`);
    }
    onProgress({ type: "done", bytesWritten: fed });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Restore cancelled");
    }
    throw err;
  } finally {
    await removePgpass(passfile);
  }
}
