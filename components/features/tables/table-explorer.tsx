"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, HardDriveDownload, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/features/common/empty-state";
import { listTablesAction } from "@/lib/actions/connections";
import { formatBytes } from "@/lib/format";
import type { TableInfo } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function TableExplorer({
  connectionId,
  databases,
  initialDatabase,
}: {
  connectionId: string;
  databases: string[];
  initialDatabase?: string;
}) {
  const t = useT();
  const [database, setDatabase] = useState(
    initialDatabase && databases.includes(initialDatabase)
      ? initialDatabase
      : (databases[0] ?? ""),
  );
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!database) return;
    start(async () => {
      const res = await listTablesAction(connectionId, database);
      if (res.ok) {
        setTables(res.data);
        setError(null);
      } else {
        setTables([]);
        setError(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database, connectionId]);

  if (databases.length === 0) {
    return (
      <EmptyState
        icon={TableProperties}
        title={t("tableExplorer.noDatabasesTitle")}
        description={t("tableExplorer.noDatabasesDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("tableExplorer.databaseLabel")}</span>
          <Select value={database} onValueChange={(v) => setDatabase(v as string)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("tableExplorer.selectDatabasePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db} value={db}>
                  {db}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <Button
          render={
            <Link
              href={`/snapshots/new?connectionId=${connectionId}&database=${encodeURIComponent(database)}`}
            />
          }
        >
          <HardDriveDownload /> {t("tableExplorer.snapshotThisDatabase")}
        </Button>
      </div>

      {error ? (
        <div className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      ) : tables.length === 0 && !pending ? (
        <EmptyState icon={TableProperties} title={t("tableExplorer.noTablesTitle")} description={t("tableExplorer.noTablesDescription", { database })} />
      ) : (
        <div className="rounded-[14px] border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("tableExplorer.columnTable")}</TableHead>
                <TableHead className="text-right">{t("tableExplorer.columnRows")}</TableHead>
                <TableHead className="text-right">{t("tableExplorer.columnSize")}</TableHead>
                <TableHead className="pr-4">{t("tableExplorer.columnEngine")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((tbl) => (
                <TableRow key={tbl.name}>
                  <TableCell className="pl-4 font-medium">{tbl.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {tbl.rows === null ? "—" : tbl.rows.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {tbl.sizeBytes === null ? "—" : formatBytes(tbl.sizeBytes)}
                  </TableCell>
                  <TableCell className="pr-4 text-muted-foreground">{tbl.engine ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
