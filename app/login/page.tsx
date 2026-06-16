import { redirect } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { authEnabled } from "@/lib/auth/config";
import { LoginForm } from "@/components/features/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // When the gate is off, there is nothing to sign into.
  if (!authEnabled()) redirect("/dashboard");

  const { next } = await searchParams;
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const dest = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  return (
    <I18nProvider locale={locale} dict={dict}>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <LoginForm next={dest} />
      </main>
    </I18nProvider>
  );
}
