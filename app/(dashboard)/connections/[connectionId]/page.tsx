import Link from "next/link";
import { notFound } from "next/navigation";
import { Database, HardDriveDownload, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TestConnectionButton } from "@/components/features/connections/test-connection-button";
import { StatusBadge } from "@/components/features/common/status-badge";
import { getConnection } from "@/lib/server/store/repos/connections";
import { getProject } from "@/lib/server/store/repos/projects";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { deleteConnectionAction } from "@/lib/actions/connections";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { engineLabel } from "@/lib/engines";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const t = await getT();
  const { connectionId } = await params;
  const conn = await getConnection(connectionId);
  if (!conn) notFound();

  const [project, allSnapshots] = await Promise.all([
    getProject(conn.projectId),
    listSnapshots(conn.projectId),
  ]);
  const snapshots = allSnapshots.filter((s) => s.sourceConnectionId === conn.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={conn.name}
        description={project ? t("connectionDetail.projectLabel", { name: project.name }) : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <TestConnectionButton connectionId={conn.id} size="default" />
            <Button variant="outline" render={<Link href={`/tables/${conn.id}`} />}>
              <Database /> {t("connectionDetail.browseTables")}
            </Button>
            <Button render={<Link href={`/snapshots/new?connectionId=${conn.id}`} />}>
              <HardDriveDownload /> {t("connectionDetail.newSnapshot")}
            </Button>
            <Button variant="ghost" size="icon" render={<Link href={`/connections/${conn.id}/edit`} />}>
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              action={deleteConnectionAction}
              actionArg={conn.id}
              title={t("connectionDetail.deleteTitle", { name: conn.name })}
              description={t("connectionDetail.deleteDescription")}
              successMessage={t("connectionDetail.deleteSuccess")}
              redirectTo="/connections"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("connectionDetail.connectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <Field label={t("connectionForm.engine")} value={engineLabel(conn.engine)} />
            <Field label={t("connectionDetail.host")} value={`${conn.host}:${conn.port}`} />
            <Field label={t("connectionDetail.user")} value={conn.user} />
            <Field label={t("connectionDetail.defaultDb")} value={conn.defaultDatabase ?? "—"} />
            <Field
              label={t("connectionDetail.lastTested")}
              value={conn.lastTestedAt ? formatDateTime(conn.lastTestedAt) : t("common.never")}
            />
            <Field label={t("connectionDetail.server")} value={conn.lastServerVersion ?? "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("connectionDetail.snapshotsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <EmptyState
              icon={HardDriveDownload}
              title={t("connectionDetail.emptyTitle")}
              description={t("connectionDetail.emptyDescription")}
              action={
                <Button render={<Link href={`/snapshots/new?connectionId=${conn.id}`} />}>
                  <HardDriveDownload /> {t("connectionDetail.newSnapshot")}
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("connectionDetail.colName")}</TableHead>
                  <TableHead>{t("connectionDetail.colDatabase")}</TableHead>
                  <TableHead>{t("connectionDetail.colSize")}</TableHead>
                  <TableHead>{t("connectionDetail.colStatus")}</TableHead>
                  <TableHead>{t("connectionDetail.colCreated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.sourceDatabase}</TableCell>
                    <TableCell>{formatBytes(s.bytes)}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
