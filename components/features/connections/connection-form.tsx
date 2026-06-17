"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import {
  createConnectionAction,
  updateConnectionAction,
  testConnectionAction,
  listDatabasesForCredentialsAction,
} from "@/lib/actions/connections";
import {
  ENGINES,
  DEFAULT_ENGINE,
  getEngineInfo,
  isEngineSupported,
  engineLabel,
} from "@/lib/engines";
import type { ConnectionPublic, ConnectionTestResult, Engine } from "@/lib/types";

type ProjectOption = { id: string; name: string };

export function ConnectionForm({
  projects,
  defaultProjectId,
  connection,
  existingConnections = [],
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
  connection?: ConnectionPublic;
  existingConnections?: ConnectionPublic[];
}) {
  const router = useRouter();
  const t = useT();
  const isEdit = Boolean(connection);

  const [projectId, setProjectId] = useState(
    connection?.projectId ?? defaultProjectId ?? projects[0]?.id ?? "",
  );
  const [engine, setEngine] = useState<Engine>(connection?.engine ?? DEFAULT_ENGINE);
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [name, setName] = useState(connection?.name ?? "");
  const [host, setHost] = useState(connection?.host ?? "127.0.0.1");
  const [port, setPort] = useState(String(connection?.port ?? 3306));
  const [user, setUser] = useState(connection?.user ?? "root");
  const [password, setPassword] = useState("");
  const [defaultDatabase, setDefaultDatabase] = useState(
    connection?.defaultDatabase ?? "",
  );

  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [availableDbs, setAvailableDbs] = useState<string[]>([]);
  const [testing, startTesting] = useTransition();
  const [saving, startSaving] = useTransition();

  const supported = isEngineSupported(engine);

  function handleTest() {
    setTestResult(null);
    startTesting(async () => {
      const res = await testConnectionAction({
        engine,
        host,
        port,
        user,
        password,
        database: defaultDatabase,
      });
      setTestResult(res);
      if (res.ok) {
        const dbs = await listDatabasesForCredentialsAction({
          engine,
          host,
          port,
          user,
          password,
        });
        setAvailableDbs(dbs.ok ? dbs.data : []);
      } else {
        setAvailableDbs([]);
      }
    });
  }

  // Editing the target/credentials invalidates the previous test + db list.
  function invalidateTest() {
    setTestResult(null);
    setAvailableDbs([]);
  }

  /** A name not already used by a connection in the selected project. */
  function uniqueName(base: string): string {
    const taken = new Set(
      existingConnections
        .filter((c) => c.projectId === projectId)
        .map((c) => c.name.toLowerCase()),
    );
    if (!taken.has(base.toLowerCase())) return base;
    let candidate = `${base} (copy)`;
    let n = 1;
    while (taken.has(candidate.toLowerCase())) {
      n += 1;
      candidate = `${base} (copy ${n})`;
    }
    return candidate;
  }

  // Prefill from an existing connection (password is never copied).
  function cloneFrom(sourceId: string) {
    const src = existingConnections.find((c) => c.id === sourceId);
    if (!src) return;
    setCloneSourceId(sourceId);
    setEngine(src.engine);
    setHost(src.host);
    setPort(String(src.port));
    setUser(src.user);
    setDefaultDatabase(src.defaultDatabase ?? "");
    setName(uniqueName(src.name));
    setPassword("");
    invalidateTest();
  }

  function handleSave() {
    startSaving(async () => {
      const res = isEdit
        ? await updateConnectionAction(connection!.id, {
            name,
            host,
            port,
            user,
            password: password || undefined,
            defaultDatabase,
          })
        : await createConnectionAction({
            projectId,
            name,
            engine,
            host,
            port,
            user,
            password,
            defaultDatabase,
          });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? t("connectionForm.toastUpdated") : t("connectionForm.toastCreated"));
      router.push(`/connections/${res.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      {!isEdit && existingConnections.length > 0 && (
        <div className="space-y-2 rounded-[12px] border border-border bg-muted/30 p-3">
          <Label htmlFor="clone">{t("connectionForm.loadFrom")}</Label>
          <Select
            value={cloneSourceId}
            onValueChange={(v) => cloneFrom(v as string)}
            items={Object.fromEntries(
              existingConnections.map((c) => [c.id, `${c.name} (${c.host})`]),
            )}
          >
            <SelectTrigger id="clone" className="w-full" data-testid="clone-source">
              <SelectValue placeholder={t("connectionForm.loadFromPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {existingConnections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {engineLabel(c.engine)} · {c.host}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("connectionForm.loadFromHint")}</p>
        </div>
      )}

      {!isEdit && (
        <div className="space-y-2">
          <Label htmlFor="project">{t("connectionForm.project")}</Label>
          <Select
            value={projectId}
            onValueChange={(v) => setProjectId(v as string)}
            items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
          >
            <SelectTrigger id="project" className="w-full">
              <SelectValue placeholder={t("connectionForm.selectProject")} />
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
      )}

      <div className="space-y-2">
        <Label htmlFor="engine">{t("connectionForm.engine")}</Label>
        <Select
          value={engine}
          onValueChange={(v) => {
            const next = v as Engine;
            setEngine(next);
            if (!isEdit) setPort(String(getEngineInfo(next).defaultPort));
            invalidateTest();
          }}
          disabled={isEdit}
          items={Object.fromEntries(ENGINES.map((e) => [e.key, e.label]))}
        >
          <SelectTrigger id="engine" className="w-full" data-testid="engine-select">
            <SelectValue placeholder={t("connectionForm.selectEngine")} />
          </SelectTrigger>
          <SelectContent>
            {ENGINES.map((e) => (
              <SelectItem key={e.key} value={e.key}>
                {e.label}
                {!e.supported ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("connectionForm.comingSoon")}
                  </span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!supported ? (
          <p
            className="rounded-[10px] border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-xs text-warning-foreground"
            data-testid="engine-coming-soon"
          >
            {t("connectionForm.engineComingSoon", { engine: getEngineInfo(engine).label })}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("connectionForm.connectionName")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("connectionForm.namePlaceholder")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
        <div className="space-y-2">
          <Label htmlFor="host">{t("connectionForm.host")}</Label>
          <Input
            id="host"
            value={host}
            onChange={(e) => {
            setHost(e.target.value);
            invalidateTest();
          }}
            placeholder="mysql-a or host.docker.internal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">{t("connectionForm.port")}</Label>
          <Input
            id="port"
            inputMode="numeric"
            value={port}
            onChange={(e) => {
            setPort(e.target.value);
            invalidateTest();
          }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="user">{t("connectionForm.user")}</Label>
          <Input
            id="user"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              invalidateTest();
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">
            {t("connectionForm.password")} {isEdit && <span className="text-muted-foreground">{t("connectionForm.passwordUnchanged")}</span>}
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
            setPassword(e.target.value);
            invalidateTest();
          }}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultDatabase">{t("connectionForm.defaultDatabase")}</Label>
        <Input
          id="defaultDatabase"
          value={defaultDatabase}
          onChange={(e) => setDefaultDatabase(e.target.value)}
          placeholder="test"
        />
        {availableDbs.length > 0 ? (
          <div className="space-y-1.5 pt-1" data-testid="db-picker">
            <p className="text-xs text-muted-foreground">{t("connectionForm.pickDatabase")}</p>
            <div className="flex flex-wrap gap-1.5">
              {availableDbs.map((db) => (
                <button
                  key={db}
                  type="button"
                  onClick={() => setDefaultDatabase(db)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    defaultDatabase === db
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {db}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("connectionForm.loadDatabasesHint")}
          </p>
        )}
      </div>

      {testResult && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-[12px] border px-3 py-2.5 text-sm",
            testResult.ok
              ? "border-success/30 bg-success/10 text-success-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          data-testid="test-result"
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {testResult.ok
              ? t("connectionForm.connected", { version: testResult.serverVersion ?? "MySQL" })
              : testResult.error}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" onClick={handleTest} disabled={testing || !supported}>
          {testing ? <Loader2 className="animate-spin" /> : <Plug />}
          {t("connectionForm.testConnection")}
        </Button>
        <Button onClick={handleSave} disabled={saving || !supported || !name || !projectId}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? t("common.saveChanges") : t("connectionForm.createConnection")}
        </Button>
      </div>
    </div>
  );
}
