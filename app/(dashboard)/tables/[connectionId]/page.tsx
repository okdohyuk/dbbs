import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { TableExplorer } from "@/components/features/tables/table-explorer";
import { TestConnectionButton } from "@/components/features/connections/test-connection-button";
import { getConnection } from "@/lib/server/store/repos/connections";
import { listDatabasesAction } from "@/lib/actions/connections";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ database?: string }>;
}) {
  const t = await getT();
  const { connectionId } = await params;
  const { database } = await searchParams;
  const conn = await getConnection(connectionId);
  if (!conn) notFound();

  const dbResult = await listDatabasesAction(connectionId);

  return (
    <div>
      <PageHeader
        title={t("tablesPage.title")}
        description={`${conn.name} · ${conn.host}:${conn.port}`}
        actions={
          <Button variant="outline" render={<Link href={`/connections/${conn.id}`} />}>
            {t("tablesPage.backToConnection")}
          </Button>
        }
      />
      <Card>
        <CardContent>
          {dbResult.ok ? (
            <TableExplorer
              connectionId={conn.id}
              databases={dbResult.data}
              initialDatabase={database ?? conn.defaultDatabase ?? undefined}
            />
          ) : (
            <div className="space-y-3">
              <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {t("tablesPage.serverUnreachable", { error: dbResult.error })}
              </div>
              <TestConnectionButton connectionId={conn.id} size="default" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
