import Link from "next/link";
import type { ReactNode } from "react";
import { Database, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { SnapshotWizard } from "@/components/features/snapshots/snapshot-wizard";
import { UploadSnapshotForm } from "@/components/features/snapshots/upload-snapshot-form";
import { SnapshotCreateTabs } from "@/components/features/snapshots/snapshot-create-tabs";
import { TestConnectionButton } from "@/components/features/connections/test-connection-button";
import { getConnection, listConnections } from "@/lib/server/store/repos/connections";
import { listProjects } from "@/lib/server/store/repos/projects";
import { listDatabasesAction } from "@/lib/actions/connections";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ connectionId?: string; database?: string }>;
}) {
  const t = await getT();
  const { connectionId, database } = await searchParams;
  const projects = await listProjects();

  let connectionPanel: ReactNode;
  let defaultProjectId: string | undefined;

  if (connectionId) {
    const conn = await getConnection(connectionId);
    if (!conn) {
      connectionPanel = (
        <EmptyState icon={Database} title={t("snapshotNew.connectionNotFound")} />
      );
    } else {
      defaultProjectId = conn.projectId;
      const dbResult = await listDatabasesAction(connectionId);
      connectionPanel = dbResult.ok ? (
        <SnapshotWizard
          connectionId={conn.id}
          connectionName={conn.name}
          databases={dbResult.data}
          initialDatabase={database ?? conn.defaultDatabase ?? undefined}
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {t("snapshotNew.serverUnreachable", { error: dbResult.error })}
          </div>
          <TestConnectionButton connectionId={conn.id} size="default" />
        </div>
      );
    }
  } else {
    const connections = await listConnections();
    connectionPanel =
      connections.length === 0 ? (
        <EmptyState
          icon={Database}
          title={t("snapshotNew.noConnections")}
          description={t("snapshotNew.addConnectionFirst")}
          action={
            <Button render={<Link href="/connections/new" />}>
              {t("snapshotNew.newConnection")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("snapshotNew.pickConnection")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connections.map((c) => (
              <Link key={c.id} href={`/snapshots/new?connectionId=${c.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.host}:{c.port}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      );
  }

  const uploadPanel = (
    <UploadSnapshotForm
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      defaultProjectId={defaultProjectId}
    />
  );

  return (
    <div>
      <PageHeader title={t("snapshotNew.title")} description={t("snapshotNew.description")} />
      <Card>
        <CardContent>
          <SnapshotCreateTabs connectionPanel={connectionPanel} uploadPanel={uploadPanel} />
        </CardContent>
      </Card>
    </div>
  );
}
