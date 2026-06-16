"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Dict, type TFunction } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

type I18nValue = { locale: Locale; dict: Dict };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

export function useT(): TFunction {
  const { dict } = useI18n();
  return (path, vars) => translate(dict, path, vars);
}
