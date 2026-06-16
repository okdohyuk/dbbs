"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { JobStatus } from "@/lib/types";

const STYLES: Record<JobStatus, string> = {
  running: "border-primary/30 bg-primary/10 text-primary",
  completed: "border-success/30 bg-success/15 text-success-foreground",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  interrupted: "border-warning/40 bg-warning/15 text-warning-foreground",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const t = useT();
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {t(`status.${status}`)}
    </Badge>
  );
}
