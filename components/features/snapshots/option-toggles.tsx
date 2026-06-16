"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { SnapshotOptions } from "@/lib/types";

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-[12px] border border-border px-3 py-2.5",
        disabled && "opacity-50",
      )}
    >
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

export function OptionToggles({
  value,
  onChange,
}: {
  value: SnapshotOptions;
  onChange: (next: SnapshotOptions) => void;
}) {
  const t = useT();
  const set = (patch: Partial<SnapshotOptions>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>{t("optionToggles.contents")}</Label>
        <Tabs
          value={value.mode}
          onValueChange={(v) => set({ mode: v as SnapshotOptions["mode"] })}
        >
          <TabsList>
            <TabsTrigger value="full">{t("optionToggles.schemaAndData")}</TabsTrigger>
            <TabsTrigger value="schema-only">{t("optionToggles.schemaOnly")}</TabsTrigger>
            <TabsTrigger value="data-only">{t("optionToggles.dataOnly")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label={t("optionToggles.storedProceduresLabel")}
          hint="--routines"
          checked={value.routines}
          onChange={(c) => set({ routines: c })}
        />
        <ToggleRow
          label={t("optionToggles.triggersLabel")}
          hint="--triggers"
          checked={value.triggers}
          onChange={(c) => set({ triggers: c })}
        />
        <ToggleRow
          label={t("optionToggles.eventsLabel")}
          hint="--events"
          checked={value.events}
          onChange={(c) => set({ events: c })}
        />
        <ToggleRow
          label={t("optionToggles.addDropTableLabel")}
          hint="--add-drop-table"
          checked={value.addDropTable}
          disabled={value.mode === "data-only"}
          onChange={(c) => set({ addDropTable: c })}
        />
        <ToggleRow
          label={t("optionToggles.consistentSnapshotLabel")}
          hint="--single-transaction"
          checked={value.singleTransaction}
          onChange={(c) => set({ singleTransaction: c })}
        />
        <ToggleRow
          label={t("optionToggles.compressLabel")}
          hint={t("optionToggles.compressHint")}
          checked={value.compress}
          onChange={(c) => set({ compress: c })}
        />
      </div>
    </div>
  );
}
