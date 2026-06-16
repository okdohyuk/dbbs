"use client";

import type { ReactNode } from "react";
import { Database, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/client";

export function SnapshotCreateTabs({
  connectionPanel,
  uploadPanel,
  defaultTab = "connection",
}: {
  connectionPanel: ReactNode;
  uploadPanel: ReactNode;
  defaultTab?: "connection" | "upload";
}) {
  const t = useT();
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="connection">
          <Database className="size-4" /> {t("snapshotNew.fromConnection")}
        </TabsTrigger>
        <TabsTrigger value="upload">
          <Upload className="size-4" /> {t("snapshotNew.uploadFile")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="connection" className="pt-5">
        {connectionPanel}
      </TabsContent>
      <TabsContent value="upload" className="pt-5">
        {uploadPanel}
      </TabsContent>
    </Tabs>
  );
}
