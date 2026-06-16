"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/lib/actions/projects";
import { useT } from "@/lib/i18n/client";

export function CreateProjectDialog() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    setError(null);
    startTransition(async () => {
      const res = await createProjectAction({ name, description });
      if (!res.ok) {
        setError(res.fieldErrors?.name ?? res.error);
        return;
      }
      toast.success(t("projectDialog.createdToast", { name: res.data.name }));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus /> {t("projectDialog.newProject")}
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("projectDialog.newProject")}</DialogTitle>
            <DialogDescription>
              {t("projectDialog.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("projectDialog.nameLabel")}</Label>
              <Input id="name" name="name" placeholder={t("projectDialog.namePlaceholder")} autoFocus required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t("projectDialog.descriptionLabel")}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={t("projectDialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t("projectDialog.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
