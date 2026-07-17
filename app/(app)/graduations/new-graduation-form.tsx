"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  createGraduation,
  type GraduationActionState,
} from "@/actions/graduations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BELT_OPTIONS } from "@/lib/validations/members";

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";

const initialState: GraduationActionState = null;

export type GraduationMemberOption = {
  id: string;
  name: string;
  current_belt: string | null;
  current_degree: number;
};

export function NewGraduationForm({
  members,
}: {
  members: GraduationMemberOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createGraduation,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
        Nenhum membro ativo disponível para graduação.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="member_id">Aluno *</Label>
        <select
          id="member_id"
          name="member_id"
          required
          defaultValue=""
          className={selectClassName}
        >
          <option value="" disabled>
            Selecione
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.current_belt
                ? ` · ${m.current_belt} (${m.current_degree})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="belt">Faixa *</Label>
          <select
            id="belt"
            name="belt"
            required
            defaultValue="Branca"
            className={selectClassName}
          >
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="degree">Grau *</Label>
          <Input
            id="degree"
            name="degree"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            required
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graduated_at">Data</Label>
        <Input
          id="graduated_at"
          name="graduated_at"
          type="date"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Opcional"
          className="h-11"
        />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar graduação"}
      </Button>
    </form>
  );
}
