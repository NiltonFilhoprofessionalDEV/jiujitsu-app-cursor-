"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createClass, type ClassActionState } from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BELT_OPTIONS } from "@/lib/validations/members";
import { selectClassName } from "./labels";

const initialState: ClassActionState = null;

export type UnitOption = {
  id: string;
  name: string;
};

export function NewClassForm({ units }: { units: UnitOption[] }) {
  const [state, formAction, pending] = useActionState(createClass, initialState);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Kids · Adulto · Competição"
          className="h-11"
        />
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

      {units.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="unit_id">Unidade</Label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Sem unidade</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="unit_id" value="" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="minimum_age">Idade mín.</Label>
          <Input
            id="minimum_age"
            name="minimum_age"
            type="number"
            min={0}
            max={120}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maximum_age">Idade máx.</Label>
          <Input
            id="maximum_age"
            name="maximum_age"
            type="number"
            min={0}
            max={120}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="minimum_belt">Faixa mín.</Label>
          <select
            id="minimum_belt"
            name="minimum_belt"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Qualquer</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maximum_belt">Faixa máx.</Label>
          <select
            id="maximum_belt"
            name="maximum_belt"
            defaultValue=""
            className={selectClassName}
          >
            <option value="">Qualquer</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {pending ? "Criando…" : "Criar turma"}
      </Button>
    </form>
  );
}
