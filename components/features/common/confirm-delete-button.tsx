"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";
import type { ActionResult } from "@/lib/actions/result";

export function ConfirmDeleteButton({
  action,
  actionArg,
  title = "Delete",
  description = "This action cannot be undone.",
  successMessage = "Deleted",
  trigger,
  redirectTo,
}: {
  /** A server action passed from a Server Component (not an inline closure). */
  action: (arg: string) => Promise<ActionResult<unknown>>;
  actionArg: string;
  title?: string;
  description?: string;
  successMessage?: string;
  trigger?: ReactElement;
  redirectTo?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = await action(actionArg);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon" aria-label="Delete">
              <Trash2 className="text-destructive" />
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? t("common.deleting") : t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
