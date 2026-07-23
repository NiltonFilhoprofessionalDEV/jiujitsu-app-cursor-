"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  createUnit,
  updateUnit,
  type AcademyActionState,
  type AcademyUnit,
} from "@/actions/academies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectClassName } from "@/app/(app)/classes/labels";
import { BRAZIL_TIMEZONES } from "@/lib/sessions/auto-open";

const initialState: AcademyActionState = null;

function CreateUnitForm({ canEdit }: { canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(createUnit, initialState);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!canEdit) return null;

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-dashed border-border p-4"
    >
      <p className="text-sm font-medium text-foreground">Nova unidade</p>
      <div className="space-y-2">
        <Label htmlFor="unit-name">Nome *</Label>
        <Input
          id="unit-name"
          name="name"
          required
          placeholder="Ex.: Unidade Centro"
          className="h-11"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="unit-city">Cidade</Label>
          <Input id="unit-city" name="city" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit-state">Estado</Label>
          <Input
            id="unit-state"
            name="state"
            maxLength={2}
            className="h-11"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit-address">Endereço</Label>
        <Input id="unit-address" name="address" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit-phone">Telefone</Label>
        <Input id="unit-phone" name="phone" type="tel" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unit-timezone">Fuso horário</Label>
        <select
          id="unit-timezone"
          name="timezone"
          defaultValue=""
          className={selectClassName}
        >
          <option value="">Usar fuso da academia</option>
          {BRAZIL_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {pending ? "Adicionando…" : "Adicionar unidade"}
      </Button>
    </form>
  );
}

function UnitCard({
  unit,
  canEdit,
}: {
  unit: AcademyUnit;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateUnit, initialState);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-border bg-black/20 p-4"
    >
      <input type="hidden" name="id" value={unit.id} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{unit.name}</p>
        <span
          className={
            unit.is_active
              ? "text-xs text-primary"
              : "text-xs text-muted-foreground"
          }
        >
          {unit.is_active ? "Ativa" : "Inativa"}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`name-${unit.id}`}>Nome *</Label>
        <Input
          id={`name-${unit.id}`}
          name="name"
          required
          defaultValue={unit.name}
          disabled={!canEdit}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`city-${unit.id}`}>Cidade</Label>
          <Input
            id={`city-${unit.id}`}
            name="city"
            defaultValue={unit.city ?? ""}
            disabled={!canEdit}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`state-${unit.id}`}>Estado</Label>
          <Input
            id={`state-${unit.id}`}
            name="state"
            maxLength={2}
            defaultValue={unit.state ?? ""}
            disabled={!canEdit}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`address-${unit.id}`}>Endereço</Label>
        <Input
          id={`address-${unit.id}`}
          name="address"
          defaultValue={unit.address ?? ""}
          disabled={!canEdit}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`phone-${unit.id}`}>Telefone</Label>
        <Input
          id={`phone-${unit.id}`}
          name="phone"
          defaultValue={unit.phone ?? ""}
          disabled={!canEdit}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`timezone-${unit.id}`}>Fuso horário</Label>
        <select
          id={`timezone-${unit.id}`}
          name="timezone"
          defaultValue={unit.timezone ?? ""}
          disabled={!canEdit}
          className={selectClassName}
        >
          <option value="">Usar fuso da academia</option>
          {BRAZIL_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {canEdit ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`active-${unit.id}`}>Status</Label>
            <select
              id={`active-${unit.id}`}
              name="is_active"
              defaultValue={unit.is_active ? "true" : "false"}
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </div>
          <Button
            type="submit"
            disabled={pending}
            variant="secondary"
            className="h-11 w-full"
          >
            {pending ? "Salvando…" : "Salvar unidade"}
          </Button>
        </>
      ) : null}
    </form>
  );
}

export function UnitsManager({
  units,
  canEdit,
}: {
  units: AcademyUnit[];
  canEdit: boolean;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
      <div>
        <h2 className="text-base font-semibold text-foreground">Unidades</h2>
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? "Owner e Admin podem criar e editar unidades."
            : "Visualização das unidades da academia."}
        </p>
      </div>

      <CreateUnitForm canEdit={canEdit} />

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma unidade cadastrada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} canEdit={canEdit} />
          ))}
        </div>
      )}
    </section>
  );
}
