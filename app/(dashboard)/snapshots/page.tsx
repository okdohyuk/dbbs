import Link from "next/link";
import { HardDriveDownload, HardDriveUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { ConfirmDeleteButton } from "@/components/features/common/confirm-delete-button";
import { StatusBadge } from "@/components/features/common/status-badge";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { listConnections } from "@/lib/server/store/repos/connections";
import { deleteSnapshotAction } from "@/lib/actions/snapshots";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";
import type { SnapshotOptions } from "@/lib/types";

export const dynamic = "force-dynamic";

function summarize(o: SnapshotOptions, t: TFunction): string {
  const parts = [
    o.mode === "full"
      ? t("snapshotsList.optFull")
      : o.mode === "schema-only"
        ? t("snapshotsList.optSchema")
        : t("snapshotsList.optData"),
  ];
  if (o.routines) parts.push(t("snapshotsList.optRoutines"));
  if (o.triggers) parts.push(t("snapshotsList.optTriggers"));
  if (o.events) parts.push(t("snapshotsList.optEvents"));
  if (o.compress) parts.push(t("snapshotsList.optGzip"));
  return parts.join(" · ");
}

export default async function SnapshotsPage() {
  const t = await getT();
  const [snapshots, connections] = await Promise.all([listSnapshots(), listConnections()]);
  const connName = (id: string) => connections.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title={t("nav.snapshots")}
        description={t("snapshotsList.description")}
        actions={
          <Button render={<Link href="/snapshots/new" />}>
            <HardDriveDownload /> {t("snapshotsList.newSnapshot")}
          </Button>
        }
      />

      {snapshots.length === 0 ? (
        <EmptyState
          icon={HardDriveDownload}
          title={t("snapshotsList.emptyTitle")}
          description={t("snapshotsList.emptyDescription")}
          action={
            <Button render={<Link href="/snapshots/new" />}>
              <HardDriveDownload /> {t("snapshotsList.newSnapshot")}
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">{t("snapshotsList.colName")}</TableHead>
                  <TableHead>{t("snapshotsList.colSource")}</TableHead>
                  <TableHead>{t("snapshotsList.colDatabase")}</TableHead>
                  <TableHead>{t("snapshotsList.colOptions")}</TableHead>
                  <TableHead>{t("snapshotsList.colSize")}</TableHead>
                  <TableHead>{t("snapshotsList.colStatus")}</TableHead>
                  <TableHead>{t("snapshotsList.colCreated")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("snapshotsList.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.sourceConnectionId
                        ? connName(s.sourceConnectionId)
                        : t("snapshotsList.uploaded")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.sourceDatabase}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.sourceConnectionId
                        ? summarize(s.options, t)
                        : t("snapshotsList.imported")}
                    </TableCell>
                    <TableCell>{formatBytes(s.bytes)}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={s.status !== "completed"}
                          render={
                            s.status === "completed" ? (
                              <Link href={`/restore?snapshotId=${s.id}`} />
                            ) : undefined
                          }
                        >
                          <HardDriveUpload /> {t("nav.restore")}
                        </Button>
                        <ConfirmDeleteButton
                          action={deleteSnapshotAction}
                          actionArg={s.id}
                          title={t("snapshotsList.deleteTitle", { name: s.name })}
                          description={t("snapshotsList.deleteDescription")}
                          successMessage={t("snapshotsList.deleteSuccess")}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
