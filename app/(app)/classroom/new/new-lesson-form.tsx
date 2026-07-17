"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  createVirtualLesson,
  type ClassroomActionState,
} from "@/actions/classroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClassName } from "@/app/(app)/classes/labels";

const initialState: ClassroomActionState = null;

export type ClassOption = {
  id: string;
  name: string;
};

export function NewLessonForm({ classes }: { classes: ClassOption[] }) {
  const [state, formAction, pending] = useActionState(
    createVirtualLesson,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required className="h-11" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_url">Link do YouTube *</Label>
        <Input
          id="youtube_url"
          name="youtube_url"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v=…"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="orientation">Orientação</Label>
        <select
          id="orientation"
          name="orientation"
          defaultValue="horizontal"
          className={selectClassName}
        >
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="class_id">Turma</Label>
        <select
          id="class_id"
          name="class_id"
          defaultValue=""
          className={selectClassName}
        >
          <option value="">Nenhuma (geral)</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">Visibilidade</Label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="academy"
          className={selectClassName}
        >
          <option value="academy">Toda academia</option>
          <option value="class">Só esta turma</option>
        </select>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Publicando…" : "Publicar aula"}
      </Button>
    </form>
  );
}
