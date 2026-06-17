"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { HardDriveDownload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionToggles } from "@/components/features/snapshots/option-toggles";
import { JobProgress } from "@/components/features/jobs/job-progress";
import { startSnapshotAction } from "@/lib/actions/snapshots";
import { DEFAULT_SNAPSHOT_OPTIONS, type SnapshotOptions } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function SnapshotWizard({
  connectionId,
  connectionName,
  databases,
  initialDatabase,
}: {
  connectionId: string;
  connectionName: string;
  databases: string[];
  initialDatabase?: string;
}) {
  const t = useT();
  const firstDb =
    initialDatabase && databases.includes(initialDatabase)
      ? initialDatabase
      : (databases[0] ?? "");

  const [database, setDatabase] = useState(firstDb);
  const [name, setName] = useState(firstDb ? t("snapshotWizard.defaultName", { db: firstDb }) : "");
  const [options, setOptions] = useState<SnapshotOptions>(DEFAULT_SNAPSHOT_OPTIONS);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function handleStart() {
    start(async () => {
      const res = await startSnapshotAction({ connectionId, database, name, options });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSnapshotId(res.data.snapshotId);
    });
  }

  if (snapshotId) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="text-sm text-muted-foreground">
          {t("snapshotWizard.summaryPrefix")}{" "}
          <span className="font-medium text-foreground">{name}</span>{" "}
          {t("snapshotWizard.summaryFrom")}{" "}
          <span className="font-medium text-foreground">
            {connectionName} · {database}
          </span>
        </div>
        <JobProgress
          jobId={snapshotId}
          runningLabel={t("snapshotWizard.dumpingLabel")}
          onDone={(status, error) => {
            setDone(true);
            if (status === "completed") toast.success(t("snapshotWizard.completedToast"));
            else if (status === "failed") toast.error(error ?? t("snapshotWizard.failedToast"));
          }}
        />
        {done && (
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/snapshots" />}>{t("snapshotWizard.viewSnapshots")}</Button>
            <Button variant="outline" render={<Link href="/restore" />}>
              {t("snapshotWizard.restoreSnapshot")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("snapshotWizard.noDatabases")}
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="database">{t("snapshotWizard.sourceDatabase")}</Label>
          <Select
            value={database}
            onValueChange={(v) => {
              const next = v as string;
              setDatabase(next);
              if (!name || name === t("snapshotWizard.defaultName", { db: database }))
                setName(t("snapshotWizard.defaultName", { db: next }));
            }}
          >
            <SelectTrigger id="database" className="w-full">
              <SelectValue placeholder={t("snapshotWizard.selectDatabase")} />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db} value={db}>
                  {db}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t("snapshotWizard.snapshotName")}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <OptionToggles value={options} onChange={setOptions} />

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={handleStart} disabled={pending || !database || !name}>
          {pending ? <Loader2 className="animate-spin" /> : <HardDriveDownload />}
          {t("snapshotWizard.createSnapshot")}
        </Button>
      </div>
    </div>
  );
}
