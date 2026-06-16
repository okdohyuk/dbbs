"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";
import { setLocaleAction } from "@/lib/actions/settings";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useI18n();
  const [pending, start] = useTransition();

  function onChange(next: string) {
    if (next === locale) return;
    start(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <Select
      value={locale}
      onValueChange={(v) => onChange(v as string)}
      disabled={pending}
      items={LOCALE_LABELS}
    >
      <SelectTrigger className="w-48" data-testid="language-switcher">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
