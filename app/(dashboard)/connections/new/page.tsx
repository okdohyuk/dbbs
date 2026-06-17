import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { ConnectionForm } from "@/components/features/connections/connection-form";
import { listProjects } from "@/lib/server/store/repos/projects";
import { listConnections } from "@/lib/server/store/repos/connections";
import { toConnectionPublicList } from "@/lib/dto";
import { getT } from "@/lib/i18n/server";
import { FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const t = await getT();
  const { projectId } = await searchParams;
  const [projects, connections] = await Promise.all([listProjects(), listConnections()]);

  return (
    <div>
      <PageHeader
        title={t("connectionNew.title")}
        description={t("connectionNew.description")}
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t("connectionNew.emptyTitle")}
          description={t("connectionNew.emptyDescription")}
          action={<Button render={<Link href="/projects" />}>{t("connectionNew.goToProjects")}</Button>}
        />
      ) : (
        <Card>
          <CardContent>
            <ConnectionForm
              projects={projects.map((p) => ({ id: p.id, name: p.name }))}
              defaultProjectId={projectId}
              existingConnections={toConnectionPublicList(connections)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
