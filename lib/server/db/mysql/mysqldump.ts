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
import { findMysqldump } from "./locate-binary";
import { buildDumpArgs } from "./flags";
import { writeDefaultsFile, removeDefaultsFile } from "./defaults-file";

export async function runMysqldump(args: {
  cfg: ConnectionConfig;
  database: string;
  outPath: string;
  options: SnapshotOptions;
  onProgress: ProgressHandler;
  signal: AbortSignal;
}): Promise<{ filePath: string; bytes: number }> {
  const { cfg, database, outPath, options, onProgress, signal } = args;
  const bin = await findMysqldump();
  const defaultsFile = await writeDefaultsFile(cfg);
  await fsp.mkdir(path.dirname(outPath), { recursive: true });

  const dumpArgs = buildDumpArgs(options, database, bin, defaultsFile);
  onProgress({ type: "start", message: `Dumping ${database}` });

  const child = spawn(bin.path, dumpArgs, { signal });
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
      throw new Error(
        `mysqldump exited with code ${code}: ${stderr.slice(-600).trim()}`,
      );
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
    await removeDefaultsFile(defaultsFile);
  }
}
