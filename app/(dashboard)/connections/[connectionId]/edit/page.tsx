import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ConnectionForm } from "@/components/features/connections/connection-form";
import { getConnection } from "@/lib/server/store/repos/connections";
import { getProject } from "@/lib/server/store/repos/projects";
import { toConnectionPublic } from "@/lib/dto";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditConnectionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const t = await getT();
  const { connectionId } = await params;
  const conn = await getConnection(connectionId);
  if (!conn) notFound();
  const project = await getProject(conn.projectId);

  return (
    <div>
      <PageHeader title={t("connectionEdit.title")} description={conn.name} />
      <Card>
        <CardContent>
          <ConnectionForm
            projects={project ? [{ id: project.id, name: project.name }] : []}
            connection={toConnectionPublic(conn)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
