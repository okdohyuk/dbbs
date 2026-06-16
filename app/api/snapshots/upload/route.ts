import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getProject } from "@/lib/server/store/repos/projects";
import { createSnapshot } from "@/lib/server/store/repos/snapshots";
import { buildSnapshotPath } from "@/lib/server/paths";
import { DEFAULT_SNAPSHOT_OPTIONS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Import an existing dump by streaming the uploaded file to SNAPSHOT_DIR and
 *  registering it as a completed snapshot (no live source connection). */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = (searchParams.get("projectId") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  const sourceDatabase = (searchParams.get("sourceDatabase") || "").trim();
  const filename = (searchParams.get("filename") || "upload.sql").trim();

  if (!projectId || !name || !sourceDatabase) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".sql") && !lower.endsWith(".sql.gz")) {
    return NextResponse.json(
      { ok: false, error: "Only .sql or .sql.gz files are supported" },
      { status: 400 },
    );
  }
  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }
  if (!req.body) {
    return NextResponse.json({ ok: false, error: "Empty request body" }, { status: 400 });
  }

  const compressed = lower.endsWith(".gz");
  let outPath: string;
  try {
    outPath = buildSnapshotPath(name, sourceDatabase, compressed);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid path" },
      { status: 400 },
    );
  }

  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  try {
    await pipeline(
      Readable.fromWeb(req.body as unknown as NodeWebReadableStream<Uint8Array>),
      fs.createWriteStream(outPath),
    );
  } catch {
    await fsp.rm(outPath, { force: true }).catch(() => {});
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }

  const { size } = await fsp.stat(outPath);
  if (size === 0) {
    await fsp.rm(outPath, { force: true }).catch(() => {});
    return NextResponse.json({ ok: false, error: "Uploaded file is empty" }, { status: 400 });
  }

  const snapshot = await createSnapshot({
    projectId,
    sourceConnectionId: null,
    sourceDatabase,
    name,
    filePath: outPath,
    compressed,
    options: { ...DEFAULT_SNAPSHOT_OPTIONS, compress: compressed },
    status: "completed",
    bytes: size,
  });

  revalidatePath("/snapshots");
  revalidatePath("/restore");
  return NextResponse.json({ ok: true, snapshotId: snapshot.id });
}
