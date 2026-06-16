import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ConnectionConfig, ProgressHandler } from "@/lib/server/db/adapter";
import type { SnapshotOptions } from "@/lib/types";
import { findPgDump } from "./locate-binary";
import { writePgpass, removePgpass } from "./pgpass";

function buildArgs(
  cfg: ConnectionConfig,
  database: string,
  options: SnapshotOptions,
): string[] {
  const args = [
    "--host",
    cfg.host,
    "--port",
    String(cfg.port),
    "--username",
    cfg.user,
    "--no-password",
    "--no-owner",
    "--no-privileges",
  ];
  if (options.mode === "schema-only") args.push("--schema-only");
  if (options.mode === "data-only") args.push("--data-only");
  if (options.addDropTable && options.mode !== "data-only") {
    args.push("--clean", "--if-exists");
  }
  args.push("--dbname", database);
  return args;
}

export async function runPgDump(args: {
  cfg: ConnectionConfig;
  database: string;
  outPath: string;
  options: SnapshotOptions;
  onProgress: ProgressHandler;
  signal: AbortSignal;
}): Promise<{ filePath: string; bytes: number }> {
  const { cfg, database, outPath, options, onProgress, signal } = args;
  const bin = await findPgDump();
  const passfile = await writePgpass(cfg);
  await fsp.mkdir(path.dirname(outPath), { recursive: true });

  onProgress({ type: "start", message: `Dumping ${database}` });
  const child = spawn(bin.path, buildArgs(cfg, database, options), {
    signal,
    env: { ...process.env, PGPASSFILE: passfile },
  });
  const outStream = fs.createWriteStream(outPath);

  let dumped = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      dumped += chunk.length;
      onProgress({ type: "progress", bytesWritten: dumped });
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
    if (options.compress) {
      await pipeline(child.stdout!, counter, zlib.createGzip(), outStream);
    } else {
      await pipeline(child.stdout!, counter, outStream);
    }
    const code = await exited;
    if (code !== 0) {
      throw new Error(`pg_dump exited with code ${code}: ${stderr.slice(-600).trim()}`);
    }
    const { size } = await fsp.stat(outPath);
    onProgress({ type: "done", bytesWritten: size });
    return { filePath: outPath, bytes: size };
  } catch (err) {
    await fsp.rm(outPath, { force: true }).catch(() => {});
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Snapshot cancelled");
    }
    throw err;
  } finally {
    await removePgpass(passfile);
  }
}
