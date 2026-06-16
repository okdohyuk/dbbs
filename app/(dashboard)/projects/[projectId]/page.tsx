import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Database, HardDriveDownload } from "lucide-react";
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
import { StatusBadge } from "@/components/features/common/status-badge";
import { getProject } from "@/lib/server/store/repos/projects";
import { listConnections } from "@/lib/server/store/repos/connections";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { deleteProjectAction } from "@/lib/actions/projects";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const t = await getT();
  const { projectId } = await params;
  const [project, connections, snapshots] = await Promise.all([
    getProject(projectId),
    listConnections(projectId),
    listSnapshots(projectId),
  ]);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button render={<Link href={`/connections/new?projectId=${project.id}`} />}>
              <Plus /> {t("projectDetail.addConnection")}
            </Button>
            <ConfirmDeleteButton
              action={deleteProjectAction}
              actionArg={project.id}
              title={t("projectDetail.deleteTitle", { name: project.name })}
              description={t("projectDetail.deleteDescription")}
              successMessage={t("projectDetail.deleteSuccess")}
              redirectTo="/projects"
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("nav.connections")}</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <EmptyState
              icon={Database}
              title={t("projectDetail.noConnections")}
              description={t("projectDetail.noConnectionsDescription")}
              action={
                <Button render={<Link href={`/connections/new?projectId=${project.id}`} />}>
                  <Plus /> {t("projectDetail.addConnection")}
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("projectDetail.colName")}</TableHead>
                  <TableHead>{t("projectDetail.colHost")}</TableHead>
                  <TableHead>{t("projectDetail.colUser")}</TableHead>
                  <TableHead>{t("projectDetail.colDefaultDb")}</TableHead>
                  <TableHead className="text-right">{t("projectDetail.colTables")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/connections/${c.id}`} className="hover:text-primary">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.host}:{c.port}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.user}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.defaultDatabase ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/tables/${c.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t("common.browse")}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("nav.snapshots")}</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <EmptyState
              icon={HardDriveDownload}
              title={t("projectDetail.noSnapshots")}
              description={t("projectDetail.noSnapshotsDescription")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("projectDetail.colName")}</TableHead>
                  <TableHead>{t("projectDetail.colDatabase")}</TableHead>
                  <TableHead>{t("projectDetail.colSize")}</TableHead>
                  <TableHead>{t("projectDetail.colStatus")}</TableHead>
                  <TableHead>{t("projectDetail.colCreated")}</TableHead>
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
