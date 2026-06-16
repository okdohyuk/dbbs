"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function setLocaleAction(locale: string): Promise<ActionResult> {
  if (!isLocale(locale)) return fail("Invalid locale");
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  // Re-render every route so server components pick up the new locale.
  revalidatePath("/", "layout");
  return ok(undefined);
}
