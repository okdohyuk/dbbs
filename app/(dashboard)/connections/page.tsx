import Link from "next/link";
import { Plus, Database, HardDriveDownload } from "lucide-react";
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
import { TestConnectionButton } from "@/components/features/connections/test-connection-button";
import { EngineBadge } from "@/components/features/connections/engine-badge";
import { listConnections } from "@/lib/server/store/repos/connections";
import { listProjects } from "@/lib/server/store/repos/projects";
import { deleteConnectionAction } from "@/lib/actions/connections";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const t = await getT();
  const [connections, projects] = await Promise.all([listConnections(), listProjects()]);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const hasProjects = projects.length > 0;

  return (
    <div>
      <PageHeader
        title={t("nav.connections")}
        description={t("connectionsList.pageDescription")}
        actions={
          hasProjects ? (
            <Button render={<Link href="/connections/new" />}>
              <Plus /> {t("connectionsList.newConnection")}
            </Button>
          ) : undefined
        }
      />

      {connections.length === 0 ? (
        <EmptyState
          icon={Database}
          title={t("connectionsList.emptyTitle")}
          description={
            hasProjects
              ? t("connectionsList.emptyDescriptionWithProjects")
              : t("connectionsList.emptyDescriptionNoProjects")
          }
          action={
            hasProjects ? (
              <Button render={<Link href="/connections/new" />}>
                <Plus /> {t("connectionsList.newConnection")}
              </Button>
            ) : (
              <Button render={<Link href="/projects" />}>{t("connectionsList.goToProjects")}</Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">{t("connectionsList.colName")}</TableHead>
                  <TableHead>{t("connectionsList.colProject")}</TableHead>
                  <TableHead>{t("connectionsList.colHost")}</TableHead>
                  <TableHead>{t("connectionsList.colUser")}</TableHead>
                  <TableHead>{t("connectionsList.colLastTested")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("connectionsList.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        <Link href={`/connections/${c.id}`} className="hover:text-primary">
                          {c.name}
                        </Link>
                        <EngineBadge engine={c.engine} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {projectName(c.projectId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.host}:{c.port}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.user}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.lastTestedAt ? formatDateTime(c.lastTestedAt) : t("common.never")}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <TestConnectionButton connectionId={c.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/tables/${c.id}`} />}
                        >
                          <Database /> {t("connectionsList.tables")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/snapshots/new?connectionId=${c.id}`} />}
                        >
                          <HardDriveDownload /> {t("connectionsList.snapshot")}
                        </Button>
                        <ConfirmDeleteButton
                          action={deleteConnectionAction}
                          actionArg={c.id}
                          title={t("connectionsList.deleteTitle", { name: c.name })}
                          description={t("connectionsList.deleteDescription")}
                          successMessage={t("connectionsList.deleteSuccess")}
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
