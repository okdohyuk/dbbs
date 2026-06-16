import type { NextRequest } from "next/server";
import { subscribe, type JobWireEvent } from "@/lib/server/jobs/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const send = (event: JobWireEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const sub = subscribe(jobId, (event) => {
        send(event);
        if (event.type === "final") close();
      });

      if (!sub) {
        // Unknown job (e.g. completed before connect, or after a restart).
        send({ type: "final", status: "interrupted" });
        close();
        return;
      }

      for (const event of sub.replay) send(event);
      if (sub.replay.some((e) => e.type === "final")) {
        sub.unsubscribe();
        close();
        return;
      }

      req.signal.addEventListener("abort", () => {
        sub.unsubscribe();
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
