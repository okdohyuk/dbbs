"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => void (await logoutAction()))}
    >
      <LogOut /> {t("auth.logout")}
    </Button>
  );
}
