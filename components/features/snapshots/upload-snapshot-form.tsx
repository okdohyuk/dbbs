"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n/client";
import { formatBytes } from "@/lib/format";

type ProjectOption = { id: string; name: string };

export function UploadSnapshotForm({
  projects,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [projectId, setProjectId] = useState(
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? ""),
  );
  const [name, setName] = useState("");
  const [sourceDatabase, setSourceDatabase] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function isDumpFile(f: File) {
    return /\.sql(\.gz)?$/i.test(f.name);
  }

  function acceptFile(f: File | null) {
    if (!f) return;
    if (!isDumpFile(f)) {
      toast.error(t("snapshotUpload.invalidFile"));
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.sql(\.gz)?$/i, "") || f.name);
  }

  function onSubmit() {
    if (!file) {
      toast.error(t("snapshotUpload.selectFile"));
      return;
    }
    start(async () => {
      const qs = new URLSearchParams({ projectId, name, sourceDatabase, filename: file.name });
      const res = await fetch(`/api/snapshots/upload?${qs.toString()}`, {
        method: "POST",
        body: file,
      });
      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? t("snapshotUpload.failed"));
        return;
      }
      toast.success(t("snapshotUpload.uploaded"));
      router.push("/snapshots");
      router.refresh();
    });
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("snapshotUpload.noProjects")}</p>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="upload-project">{t("snapshotUpload.project")}</Label>
          <Select
            value={projectId}
            onValueChange={(v) => setProjectId(v as string)}
            items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
          >
            <SelectTrigger id="upload-project" className="w-full">
              <SelectValue placeholder={t("snapshotUpload.selectProject")} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-db">{t("snapshotUpload.sourceDatabase")}</Label>
          <Input
            id="upload-db"
            value={sourceDatabase}
            onChange={(e) => setSourceDatabase(e.target.value)}
            placeholder="test"
          />
          <p className="text-xs text-muted-foreground">
            {t("snapshotUpload.sourceDatabaseHint")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-name">{t("snapshotUpload.name")}</Label>
        <Input
          id="upload-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("snapshotUpload.namePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-file">{t("snapshotUpload.file")}</Label>
        <div
          role="button"
          tabIndex={0}
          data-testid="upload-dropzone"
          aria-label={t("snapshotUpload.fileHint")}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            acceptFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed px-4 py-6 text-sm outline-none transition-colors",
            "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/30",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/40",
          )}
        >
          <FileUp
            className={cn(
              "size-5 shrink-0",
              dragging ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="min-w-0 flex-1">
            {file ? (
              <span className="font-medium text-foreground">
                {file.name}{" "}
                <span className="text-muted-foreground">({formatBytes(file.size)})</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                {dragging ? t("snapshotUpload.dropHere") : t("snapshotUpload.fileHint")}
              </span>
            )}
          </span>
        </div>
        <input
          ref={inputRef}
          id="upload-file"
          type="file"
          accept=".sql,.gz,.sql.gz,application/sql,application/gzip"
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
          data-testid="upload-file-input"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={onSubmit}
          disabled={uploading || !file || !name || !sourceDatabase || !projectId}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? t("snapshotUpload.uploading") : t("snapshotUpload.upload")}
        </Button>
      </div>
    </div>
  );
}
