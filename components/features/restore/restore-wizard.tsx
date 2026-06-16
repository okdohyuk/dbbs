"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { HardDriveUpload, Loader2, AlertTriangle } from "lucide-react";
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
import { JobProgress } from "@/components/features/jobs/job-progress";
import { useT } from "@/lib/i18n/client";
import { listDatabasesAction } from "@/lib/actions/connections";
import { startRestoreAction } from "@/lib/actions/restore";

type SnapshotOption = {
  id: string;
  name: string;
  sourceDatabase: string;
  sourceConnectionName: string;
};
type ConnectionOption = { id: string; name: string };

export function RestoreWizard({
  snapshots,
  connections,
  initialSnapshotId,
}: {
  snapshots: SnapshotOption[];
  connections: ConnectionOption[];
  initialSnapshotId?: string;
}) {
  const t = useT();
  const firstSnapshot =
    initialSnapshotId && snapshots.some((s) => s.id === initialSnapshotId)
      ? initialSnapshotId
      : (snapshots[0]?.id ?? "");
  const snapOf = (id: string) => snapshots.find((s) => s.id === id);

  const [snapshotId, setSnapshotId] = useState(firstSnapshot);
  const [targetConnectionId, setTargetConnectionId] = useState(connections[0]?.id ?? "");
  const [targetDatabase, setTargetDatabase] = useState(
    snapOf(firstSnapshot)?.sourceDatabase ?? "",
  );
  const [existingDbs, setExistingDbs] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loadingDbs, startLoadDbs] = useTransition();
  const [pending, startRun] = useTransition();

  function loadTargetDbs(connId: string) {
    if (!connId) return;
    startLoadDbs(async () => {
      const res = await listDatabasesAction(connId);
      setExistingDbs(res.ok ? res.data : []);
    });
  }

  function handleRun() {
    startRun(async () => {
      const res = await startRestoreAction({ snapshotId, targetConnectionId, targetDatabase });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setJobId(res.data.jobId);
    });
  }

  if (snapshots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("restoreWizard.noSnapshots")}
      </p>
    );
  }

  if (jobId) {
    const snap = snapOf(snapshotId);
    const target = connections.find((c) => c.id === targetConnectionId);
    return (
      <div className="max-w-2xl space-y-4">
        <div className="text-sm text-muted-foreground">
          {t("restoreWizard.restoringPrefix")}{" "}
          <span className="font-medium text-foreground">{snap?.name}</span>{" "}
          {t("restoreWizard.restoringInfix")}{" "}
          <span className="font-medium text-foreground">
            {target?.name} · {targetDatabase}
          </span>
          {t("restoreWizard.restoringSuffix")}
        </div>
        <JobProgress
          jobId={jobId}
          runningLabel={t("restoreWizard.runningLabel")}
          onDone={(status) => {
            setDone(true);
            if (status === "completed") toast.success(t("restoreWizard.restoreCompleted"));
            else if (status === "failed") toast.error(t("restoreWizard.restoreFailed"));
          }}
        />
        {done && (
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href={`/tables/${targetConnectionId}?database=${encodeURIComponent(targetDatabase)}`} />}>
              {t("restoreWizard.browseRestoredTables")}
            </Button>
            <Button variant="outline" render={<Link href="/snapshots" />}>
              {t("restoreWizard.backToSnapshots")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  const willOverwrite = existingDbs.includes(targetDatabase);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="snapshot">{t("restoreWizard.snapshotLabel")}</Label>
        <Select
          value={snapshotId}
          items={Object.fromEntries(
            snapshots.map((s) => [s.id, `${s.name} — ${s.sourceConnectionName}/${s.sourceDatabase}`]),
          )}
          onValueChange={(v) => {
            const id = v as string;
            setSnapshotId(id);
            const s = snapOf(id);
            if (s) setTargetDatabase(s.sourceDatabase);
          }}
        >
          <SelectTrigger id="snapshot" className="w-full">
            <SelectValue placeholder={t("restoreWizard.selectSnapshot")} />
          </SelectTrigger>
          <SelectContent>
            {snapshots.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} — {s.sourceConnectionName}/{s.sourceDatabase}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target">{t("restoreWizard.targetConnectionLabel")}</Label>
        <Select
          value={targetConnectionId}
          items={Object.fromEntries(connections.map((c) => [c.id, c.name]))}
          onValueChange={(v) => {
            const id = v as string;
            setTargetConnectionId(id);
            loadTargetDbs(id);
          }}
        >
          <SelectTrigger id="target" data-testid="restore-target" className="w-full">
            <SelectValue placeholder={t("restoreWizard.selectTargetConnection")} />
          </SelectTrigger>
          <SelectContent>
            {connections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDatabase">{t("restoreWizard.targetDatabaseLabel")}</Label>
        <Input
          id="targetDatabase"
          value={targetDatabase}
          onChange={(e) => setTargetDatabase(e.target.value)}
          placeholder="test"
        />
        <p className="text-xs text-muted-foreground">
          {t("restoreWizard.createdAutomatically")}
          {loadingDbs ? ` ${t("restoreWizard.loadingExistingDatabases")}` : null}
        </p>
        {existingDbs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {existingDbs.map((db) => (
              <button
                key={db}
                type="button"
                onClick={() => setTargetDatabase(db)}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {db}
              </button>
            ))}
          </div>
        )}
      </div>

      {willOverwrite && (
        <div className="flex items-start gap-2 rounded-[12px] border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-medium">{targetDatabase}</span>{" "}
            {t("restoreWizard.overwriteWarning")}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleRun}
          disabled={pending || !snapshotId || !targetConnectionId || !targetDatabase}
        >
          {pending ? <Loader2 className="animate-spin" /> : <HardDriveUpload />}
          {t("restoreWizard.restoreButton")}
        </Button>
      </div>
    </div>
  );
}
