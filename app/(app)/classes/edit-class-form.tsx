"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateClass,
  type ClassActionState,
  type ClassRow,
} from "@/actions/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BELT_OPTIONS } from "@/lib/validations/members";
import { selectClassName } from "./labels";
import type { UnitOption } from "./new-class-form";

const initialState: ClassActionState = null;

export function EditClassForm({
  klass,
  units,
}: {
  klass: ClassRow;
  units: UnitOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateClass,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      router.push(`/classes/${klass.id}`);
      router.refresh();
    }
  }, [state, router, klass.id]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={klass.id} />

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={klass.name}
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
          defaultValue={klass.description ?? ""}
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {units.length > 0 ? (
        <div className="space-y-2">
          <Label htmlFor="unit_id">Unidade</Label>
          <select
            id="unit_id"
            name="unit_id"
            defaultValue={klass.unit_id ?? ""}
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
            defaultValue={klass.minimum_age ?? ""}
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
            defaultValue={klass.maximum_age ?? ""}
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
            defaultValue={klass.minimum_belt ?? ""}
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
            defaultValue={klass.maximum_belt ?? ""}
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

      <div className="space-y-2">
        <Label htmlFor="is_active">Status</Label>
        <select
          id="is_active"
          name="is_active"
          defaultValue={klass.is_active ? "true" : "false"}
          className={selectClassName}
        >
          <option value="true">Ativa</option>
          <option value="false">Inativa</option>
        </select>
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
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </form>
  );
}
