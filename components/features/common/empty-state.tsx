import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      {Icon ? (
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
