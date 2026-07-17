"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateAcademy,
  type AcademyActionState,
  type AcademyDetails,
} from "@/actions/academies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AcademyActionState = null;

export function AcademyEditor({
  academy,
  canEdit,
}: {
  academy: AcademyDetails;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateAcademy,
    initialState,
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
      <h2 className="text-base font-semibold text-foreground">Dados gerais</h2>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={academy.name}
            disabled={!canEdit}
            className="h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={academy.phone ?? ""}
              disabled={!canEdit}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={academy.email ?? ""}
              disabled={!canEdit}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            name="instagram"
            defaultValue={academy.instagram ?? ""}
            disabled={!canEdit}
            className="h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              name="city"
              defaultValue={academy.city ?? ""}
              disabled={!canEdit}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              name="state"
              maxLength={2}
              defaultValue={academy.state ?? ""}
              disabled={!canEdit}
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            name="address"
            defaultValue={academy.address ?? ""}
            disabled={!canEdit}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={academy.description ?? ""}
            disabled={!canEdit}
            className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          />
        </div>

        {canEdit ? (
          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {pending ? "Salvando…" : "Salvar academia"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Apenas o Owner pode editar os dados da academia.
          </p>
        )}
      </form>
    </section>
  );
}
