import { CheckCircle2, XCircle, FolderArchive, KeyRound, Terminal, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { LanguageSwitcher } from "@/components/features/settings/language-switcher";
import { probeBinaries, type BinaryInfo } from "@/lib/server/db/mysql/locate-binary";
import { snapshotDir } from "@/lib/server/config";
import { hasEnvMasterSecret } from "@/lib/server/crypto/keyring";
import { getT } from "@/lib/i18n/server";
import type { TFunction } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

function BinaryRow({
  label,
  info,
  t,
}: {
  label: string;
  info: BinaryInfo | null;
  t: TFunction;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[12px] border border-border px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {info ? (
            <Badge variant="outline" className="border-success/30 bg-success/15 text-success-foreground">
              <CheckCircle2 className="size-3" /> {t("settings.found")}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
              <XCircle className="size-3" /> {t("settings.notFound")}
            </Badge>
          )}
          {info ? (
            <Badge variant="outline" className="capitalize">
              {info.kind}
            </Badge>
          ) : null}
        </div>
        {info ? (
          <p className="truncate font-mono text-xs text-muted-foreground">{info.path}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("settings.notFoundHint")}</p>
        )}
      </div>
      {info ? (
        <span className="shrink-0 text-right text-xs text-muted-foreground">
          {info.version.split("\n")[0]}
        </span>
      ) : null}
    </div>
  );
}

export default async function SettingsPage() {
  const t = await getT();
  const { mysqldump, mysql } = await probeBinaries();
  const dir = snapshotDir();
  const keyFromEnv = hasEnvMasterSecret();

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Languages className="size-4" /> {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("settings.languageDescription")}</p>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="size-4" /> {t("settings.databaseTools")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BinaryRow label="mysqldump" info={mysqldump} t={t} />
          <BinaryRow label="mysql" info={mysql} t={t} />
          <p className="text-xs text-muted-foreground">{t("settings.toolsHint")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderArchive className="size-4" /> {t("settings.storage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("settings.storageHint")}</p>
            <p className="break-all font-mono text-sm text-foreground">{dir}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> {t("settings.encryption")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("settings.encryptionHint")}</p>
            <Badge variant="outline">
              {keyFromEnv ? t("settings.masterKeyEnv") : t("settings.masterKeyFile")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
