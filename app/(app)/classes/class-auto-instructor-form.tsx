"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateClassDefaultInstructor,
  type AutoOpenInstructorOption,
  type ClassActionState,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { selectClassName } from "./labels";

const initialState: ClassActionState = null;

export function ClassAutoInstructorForm({
  classId,
  defaultInstructorId,
  instructors,
  canConfigure,
}: {
  classId: string;
  defaultInstructorId: string | null;
  instructors: AutoOpenInstructorOption[];
  canConfigure: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateClassDefaultInstructor,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Abertura automática
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Professor responsável quando o horário abrir sozinho
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="class_id" value={classId} />
        <div className="space-y-2">
          <Label htmlFor="default_instructor_id">Professor</Label>
          <select
            id="default_instructor_id"
            name="default_instructor_id"
            defaultValue={defaultInstructorId ?? ""}
            disabled={!canConfigure || pending}
            className={selectClassName}
          >
            <option value="">Selecione…</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        </div>
        {canConfigure ? (
          <Button
            type="submit"
            disabled={pending}
            variant="outline"
            className="h-10 w-full border-border"
          >
            {pending ? "Salvando…" : "Salvar professor"}
          </Button>
        ) : null}
      </form>
    </section>
  );
}
