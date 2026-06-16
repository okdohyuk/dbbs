import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";
import { translate, type TFunction } from "@/lib/i18n/translate";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

/** Server-side translation function bound to the current request's locale. */
export async function getT(): Promise<TFunction> {
  const dict = await getDictionary();
  return (path, vars) => translate(dict, path, vars);
}
