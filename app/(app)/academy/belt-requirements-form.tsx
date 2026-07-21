"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  saveBeltRequirements,
  type BeltRequirementsActionState,
} from "@/actions/belt-requirements";
import { BeltPill } from "@/components/belts/belt-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEGREES_PER_BELT } from "@/lib/graduations/belt-progress";

const initialState: BeltRequirementsActionState = null;

export function BeltRequirementsForm({
  initial,
  canEdit,
}: {
  initial: { belt: string; classesPerDegree: number | "" }[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveBeltRequirements,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Metas de graduação
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Quantas aulas o aluno precisa para cada um dos {DEGREES_PER_BELT}{" "}
          graus da faixa. Depois do {DEGREES_PER_BELT}º grau, a próxima meta é a
          faixa seguinte. Deixe em branco para não usar meta nessa faixa.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          {initial.map((row) => (
            <div
              key={row.belt}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <BeltPill belt={row.belt} />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Aulas por grau
                </p>
              </div>
              <div className="w-24 shrink-0">
                <Label htmlFor={`classes_${row.belt}`} className="sr-only">
                  Aulas por grau — {row.belt}
                </Label>
                <Input
                  id={`classes_${row.belt}`}
                  name={`classes_${row.belt}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  placeholder="—"
                  defaultValue={row.classesPerDegree}
                  disabled={!canEdit || pending}
                  className="h-10 tabular-nums"
                />
              </div>
            </div>
          ))}
        </div>

        {canEdit ? (
          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full bg-[var(--action-red)] text-white hover:bg-[var(--action-red)]/90"
          >
            {pending ? "Salvando…" : "Salvar metas"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Somente professores podem editar as metas.
          </p>
        )}
      </form>
    </section>
  );
}
