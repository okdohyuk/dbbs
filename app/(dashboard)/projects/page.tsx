import Link from "next/link";
import { FolderOpen, Database, HardDriveDownload, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { ConfirmDeleteButton } from "@/components/features/common/confirm-delete-button";
import { CreateProjectDialog } from "@/components/features/projects/create-project-dialog";
import { listProjects } from "@/lib/server/store/repos/projects";
import { listConnections } from "@/lib/server/store/repos/connections";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { deleteProjectAction } from "@/lib/actions/projects";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const t = await getT();
  const [projects, connections, snapshots] = await Promise.all([
    listProjects(),
    listConnections(),
    listSnapshots(),
  ]);

  const connCount = (projectId: string) =>
    connections.filter((c) => c.projectId === projectId).length;
  const snapCount = (projectId: string) =>
    snapshots.filter((s) => s.projectId === projectId).length;

  return (
    <div>
      <PageHeader
        title={t("nav.projects")}
        description={t("projectsList.headerDescription")}
        actions={<CreateProjectDialog />}
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t("projectsList.emptyTitle")}
          description={t("projectsList.emptyDescription")}
          action={<CreateProjectDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group relative">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight group-hover:text-primary">
                      {p.name}
                    </h3>
                    {p.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{t("projectsList.noDescription")}</p>
                    )}
                  </Link>
                  <ConfirmDeleteButton
                    action={deleteProjectAction}
                    actionArg={p.id}
                    title={t("projectsList.deleteTitle", { name: p.name })}
                    description={t("projectsList.deleteDescription")}
                    successMessage={t("projectsList.deleteSuccess")}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="size-4" /> {connCount(p.id)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <HardDriveDownload className="size-4" /> {snapCount(p.id)}
                  </span>
                  <span className="ml-auto text-xs">{formatDateTime(p.createdAt)}</span>
                </div>
                <Link
                  href={`/projects/${p.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {t("common.open")} <ChevronRight className="size-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
