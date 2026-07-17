"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateEmergencyContact,
  type ProfileActionState,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileEmergencyForm({
  contactName,
  contactPhone,
}: {
  contactName: string | null;
  contactPhone: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updateEmergencyContact, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Contato de emergência
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Visível para a academia em caso de necessidade no treino.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="emergency-name">Nome</Label>
          <Input
            id="emergency-name"
            name="emergency_contact_name"
            defaultValue={contactName ?? ""}
            placeholder="Quem ligar em emergência"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emergency-phone">Telefone</Label>
          <Input
            id="emergency-phone"
            name="emergency_contact_phone"
            type="tel"
            defaultValue={contactPhone ?? ""}
            placeholder="(00) 00000-0000"
            className="h-11"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          variant="outline"
          className="h-11 w-full"
        >
          {pending ? "Salvando…" : "Salvar contato"}
        </Button>
      </form>
    </section>
  );
}
