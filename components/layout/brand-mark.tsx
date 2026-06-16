"use client";

import { DatabaseBackup } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export function BrandMark({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-primary text-primary-foreground">
        <DatabaseBackup className="size-5" strokeWidth={2} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-bold tracking-tight text-foreground">DBBS</span>
        <span className="text-[11px] font-medium text-muted-foreground">
          {t("brand.tagline")}
        </span>
      </span>
    </div>
  );
}
