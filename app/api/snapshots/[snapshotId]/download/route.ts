import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { getSnapshot } from "@/lib/server/store/repos/snapshots";
import { assertInsideSnapshotDir, slug } from "@/lib/server/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stream a completed snapshot's dump file to the browser as a download. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ snapshotId: string }> },
) {
  const { snapshotId } = await ctx.params;

  const snap = await getSnapshot(snapshotId);
  if (!snap) {
    return NextResponse.json({ ok: false, error: "Snapshot not found" }, { status: 404 });
  }
  if (snap.status !== "completed") {
    return NextResponse.json(
      { ok: false, error: "Snapshot is not available for download" },
      { status: 409 },
    );
  }

  try {
    assertInsideSnapshotDir(snap.filePath);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid snapshot path" }, { status: 400 });
  }

  let size: number;
  try {
    ({ size } = await fsp.stat(snap.filePath));
  } catch {
    return NextResponse.json({ ok: false, error: "Snapshot file is missing" }, { status: 404 });
  }

  const ext = `.sql${snap.compressed ? ".gz" : ""}`;
  const downloadName = `${slug(snap.name)}__${slug(snap.sourceDatabase)}${ext}`;
  const body = Readable.toWeb(
    fs.createReadStream(snap.filePath),
  ) as unknown as ReadableStream<Uint8Array>;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": snap.compressed ? "application/gzip" : "application/sql",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store",
    },
  });
}
