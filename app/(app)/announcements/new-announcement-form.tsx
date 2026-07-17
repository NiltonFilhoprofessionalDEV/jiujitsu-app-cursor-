"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  createAnnouncement,
  type AnnouncementActionState,
} from "@/actions/announcements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AnnouncementActionState = null;

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

export type AnnouncementClassOption = {
  id: string;
  name: string;
};

export function NewAnnouncementForm({
  classes,
  onSuccess,
}: {
  classes: AnnouncementClassOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createAnnouncement,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="notify_members" value="on" />

      <div className="space-y-2">
        <Label htmlFor="class_id">Turma</Label>
        <select
          id="class_id"
          name="class_id"
          defaultValue=""
          className={selectClassName}
        >
          <option value="">Toda a academia</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Se escolher uma turma, só ela vê o aviso e recebe a notificação.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        Ao publicar, o aviso também aparece em <strong>Notificações</strong>{" "}
        para os destinatários.
      </p>

      <Button
        type="submit"
        className="h-11 w-full bg-[var(--page-fab-bg)] text-[var(--page-fab-fg)]"
        disabled={pending}
      >
        {pending ? "Publicando…" : "Publicar aviso"}
      </Button>
    </form>
  );
}
