import Link from "next/link";
import { FolderOpen, Database, HardDriveDownload, HardDriveUpload } from "lucide-react";
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
import { StatusBadge } from "@/components/features/common/status-badge";
import { listProjects } from "@/lib/server/store/repos/projects";
import { listConnections } from "@/lib/server/store/repos/connections";
import { listSnapshots } from "@/lib/server/store/repos/snapshots";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const STATS = [
  { key: "projects", label: "nav.projects", href: "/projects", icon: FolderOpen },
  { key: "connections", label: "nav.connections", href: "/connections", icon: Database },
  { key: "snapshots", label: "nav.snapshots", href: "/snapshots", icon: HardDriveDownload },
] as const;

export default async function DashboardPage() {
  const t = await getT();
  const [projects, connections, snapshots] = await Promise.all([
    listProjects(),
    listConnections(),
    listSnapshots(),
  ]);

  const counts: Record<string, number> = {
    projects: projects.length,
    connections: connections.length,
    snapshots: snapshots.length,
  };
  const recent = snapshots.slice(0, 8);

  return (
    <div>
      <PageHeader
        title={t("nav.overview")}
        description={t("dashboard.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => (
          <Link key={s.key} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(s.label)}
                </CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{counts[s.key]}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("dashboard.recentSnapshots")}</CardTitle>
          <Link
            href="/restore"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <HardDriveUpload className="size-4" /> {t("nav.restore")}
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.emptySnapshots")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dashboard.colName")}</TableHead>
                  <TableHead>{t("dashboard.colSourceDatabase")}</TableHead>
                  <TableHead>{t("dashboard.colSize")}</TableHead>
                  <TableHead>{t("dashboard.colStatus")}</TableHead>
                  <TableHead>{t("dashboard.colCreated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((s) => (
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
