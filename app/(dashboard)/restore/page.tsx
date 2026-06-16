import Link from "next/link";
import { HardDriveUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { RestoreWizard } from "@/components/features/restore/restore-wizard";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { listConnections } from "@/lib/server/store/repos/connections";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function RestorePage({
  searchParams,
}: {
  searchParams: Promise<{ snapshotId?: string }>;
}) {
  const t = await getT();
  const { snapshotId } = await searchParams;
  const [snapshots, connections] = await Promise.all([
    listSnapshots(),
    listConnections(),
  ]);

  const connName = (id: string) => connections.find((c) => c.id === id)?.name ?? "—";
  const completed = snapshots
    .filter((s) => s.status === "completed")
    .map((s) => ({
      id: s.id,
      name: s.name,
      sourceDatabase: s.sourceDatabase,
      sourceConnectionName: connName(s.sourceConnectionId),
    }));

  return (
    <div>
      <PageHeader
        title={t("nav.restore")}
        description={t("restorePage.description")}
      />
      <Card>
        <CardContent>
          {completed.length === 0 ? (
            <EmptyState
              icon={HardDriveUpload}
              title={t("restorePage.emptyTitle")}
              description={t("restorePage.emptyDescription")}
              action={
                <Button render={<Link href="/snapshots/new" />}>{t("restorePage.newSnapshot")}</Button>
              }
            />
          ) : (
            <RestoreWizard
              snapshots={completed}
              connections={connections.map((c) => ({ id: c.id, name: c.name }))}
              initialSnapshotId={snapshotId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
