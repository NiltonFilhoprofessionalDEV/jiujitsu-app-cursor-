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

export function NewAnnouncementForm({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
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
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="notify_members"
          value="on"
          defaultChecked
          className="h-4 w-4 rounded border-white/20"
        />
        Notificar membros ativos
      </label>
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
