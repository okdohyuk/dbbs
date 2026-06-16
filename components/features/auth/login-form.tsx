"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandMark } from "@/components/layout/brand-mark";
import { useT } from "@/lib/i18n/client";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const t = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit() {
    setError(false);
    start(async () => {
      const res = await loginAction({ password });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm shadow-[var(--shadow-card)]">
      <CardHeader className="items-center gap-3 text-center">
        <BrandMark />
        <CardTitle className="text-xl">{t("auth.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.passwordLabel")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
            />
            {error ? (
              <p className="text-sm text-destructive">{t("auth.wrongPassword")}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={pending || !password}>
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
            {pending ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
