"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  saveBeltRequirements,
  type BeltRequirementFormRow,
  type BeltRequirementsActionState,
} from "@/actions/belt-requirements";
import { BeltPill } from "@/components/belts/belt-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEGREES_PER_BELT } from "@/lib/graduations/belt-progress";
import { DEFAULT_BELT_AGE_RANGES } from "@/lib/belts/options";

const initialState: BeltRequirementsActionState = null;

export function BeltRequirementsForm({
  initial,
  canEdit,
}: {
  initial: BeltRequirementFormRow[];
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
          Aulas por grau ({DEGREES_PER_BELT} graus) e faixa etária de cada faixa.
          O app usa a idade do aluno para sugerir a próxima faixa correta
          (infantil × adulto).
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          {initial.map((row) => {
            const track = DEFAULT_BELT_AGE_RANGES[row.belt]?.track;
            return (
              <div
                key={row.belt}
                className="space-y-2 rounded-xl border border-border bg-background/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <BeltPill belt={row.belt} />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {track === "kids"
                      ? "Infantil"
                      : track === "adult"
                        ? "Adulto"
                        : "Todas"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`classes_${row.belt}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      Aulas/grau
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
                  <div className="space-y-1">
                    <Label
                      htmlFor={`min_age_${row.belt}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      Idade mín.
                    </Label>
                    <Input
                      id={`min_age_${row.belt}`}
                      name={`min_age_${row.belt}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      defaultValue={row.minAge}
                      disabled={!canEdit || pending}
                      className="h-10 tabular-nums"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`max_age_${row.belt}`}
                      className="text-[10px] text-muted-foreground"
                    >
                      Idade máx.
                    </Label>
                    <Input
                      id={`max_age_${row.belt}`}
                      name={`max_age_${row.belt}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      placeholder="—"
                      defaultValue={row.maxAge}
                      disabled={!canEdit || pending}
                      className="h-10 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            );
          })}
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
