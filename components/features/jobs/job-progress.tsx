"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { JobStatus } from "@/lib/types";

type Phase = JobStatus;

const ICONS: Record<Phase, ReactNode> = {
  running: <Loader2 className="size-4 animate-spin text-primary" />,
  completed: <CheckCircle2 className="size-4 text-success-foreground" />,
  failed: <XCircle className="size-4 text-destructive" />,
  interrupted: <AlertTriangle className="size-4 text-warning-foreground" />,
};

export function JobProgress({
  jobId,
  runningLabel,
  onDone,
}: {
  jobId: string;
  runningLabel?: string;
  onDone?: (status: Phase) => void;
}) {
  const t = useT();
  const router = useRouter();
  const LABELS: Record<Phase, string> = {
    running: t("jobProgress.working"),
    completed: t("status.completed"),
    failed: t("status.failed"),
    interrupted: t("status.interrupted"),
  };
  const [bytes, setBytes] = useState(0);
  const [log, setLog] = useState("");
  const [phase, setPhase] = useState<Phase>("running");

  useEffect(() => {
    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data) as {
        type: string;
        bytesWritten?: number;
        message?: string;
        status?: Phase;
      };
      if (typeof e.bytesWritten === "number") setBytes(e.bytesWritten);
      if (e.type === "log" && e.message) setLog(e.message);
      if (e.type === "final") {
        const status = e.status ?? "completed";
        setPhase(status);
        es.close();
        onDone?.(status);
        router.refresh();
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return (
    <div className="space-y-3 rounded-[14px] border border-border bg-muted/30 p-4" data-testid="job-progress" data-phase={phase}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          {ICONS[phase]}
          {phase === "running" ? runningLabel ?? LABELS.running : LABELS[phase]}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {t("jobProgress.transferred", { bytes: formatBytes(bytes) })}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            phase === "running" && "w-2/3 animate-pulse bg-primary",
            phase === "completed" && "w-full bg-success",
            phase === "failed" && "w-full bg-destructive",
            phase === "interrupted" && "w-full bg-warning",
          )}
        />
      </div>

      {log ? (
        <pre className="max-h-24 overflow-auto rounded-[10px] bg-background p-2 font-mono text-xs text-muted-foreground">
          {log}
        </pre>
      ) : null}
    </div>
  );
}
