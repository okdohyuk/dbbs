import Link from "next/link";
import { Database, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/features/common/empty-state";
import { SnapshotWizard } from "@/components/features/snapshots/snapshot-wizard";
import { TestConnectionButton } from "@/components/features/connections/test-connection-button";
import { getConnection, listConnections } from "@/lib/server/store/repos/connections";
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

  if (connectionId) {
    const conn = await getConnection(connectionId);
    if (!conn) {
      return (
        <div>
          <PageHeader title={t("snapshotNew.title")} />
          <EmptyState icon={Database} title={t("snapshotNew.connectionNotFound")} />
        </div>
      );
    }
    const dbResult = await listDatabasesAction(connectionId);
    return (
      <div>
        <PageHeader
          title={t("snapshotNew.title")}
          description={`${conn.name} · ${conn.host}:${conn.port}`}
        />
        <Card>
          <CardContent>
            {dbResult.ok ? (
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
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No connection chosen yet — let the user pick one.
  const connections = await listConnections();
  return (
    <div>
      <PageHeader title={t("snapshotNew.title")} description={t("snapshotNew.pickConnection")} />
      {connections.length === 0 ? (
        <EmptyState
          icon={Database}
          title={t("snapshotNew.noConnections")}
          description={t("snapshotNew.addConnectionFirst")}
          action={<Button render={<Link href="/connections/new" />}>{t("snapshotNew.newConnection")}</Button>}
        />
      ) : (
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
      )}
    </div>
  );
}
