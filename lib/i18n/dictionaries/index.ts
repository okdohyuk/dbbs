import en from "@/lib/i18n/dictionaries/en";
import ko from "@/lib/i18n/dictionaries/ko";
import type { Locale } from "@/lib/i18n/config";

export type Dictionary = typeof en;

export const dictionaries: Record<Locale, Dictionary> = { en, ko };
