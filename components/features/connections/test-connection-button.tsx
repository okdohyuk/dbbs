"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { testSavedConnectionAction } from "@/lib/actions/connections";
import { useT } from "@/lib/i18n/client";

export function TestConnectionButton({
  connectionId,
  variant = "outline",
  size = "sm",
}: {
  connectionId: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      const res = await testSavedConnectionAction(connectionId);
      if (res.ok) toast.success(t("testButton.connected", { version: res.serverVersion ?? "MySQL" }));
      else toast.error(res.error ?? t("testButton.connectionFailed"));
      router.refresh();
    });
  }

  return (
    <Button variant={variant} size={size} onClick={handle} disabled={pending} data-testid="test-connection">
      {pending ? <Loader2 className="animate-spin" /> : <Plug />}
      {t("testButton.test")}
    </Button>
  );
}
