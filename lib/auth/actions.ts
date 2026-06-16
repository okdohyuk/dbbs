"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authEnabled,
  authPassword,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/config";
import { createSessionToken, passwordMatches } from "@/lib/auth/session";
import { ok, fail, type ActionResult } from "@/lib/actions/result";

export async function loginAction(input: { password: string }): Promise<ActionResult> {
  if (!authEnabled()) return ok(undefined);
  const expected = authPassword();
  if (!expected) return ok(undefined);

  const matches = await passwordMatches(input.password ?? "", expected);
  if (!matches) return fail("Invalid password");

  const token = await createSessionToken(Date.now());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return ok(undefined);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
