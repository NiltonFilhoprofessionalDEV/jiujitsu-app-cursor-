"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updatePersonalProfile,
  type ProfileActionState,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfilePersonalForm({
  name,
  email,
  phone,
  birthDate,
  roleLabel,
  academyName,
}: {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  roleLabel: string;
  academyName: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updatePersonalProfile, null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Dados pessoais</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Nome, telefone e nascimento. E-mail e academia não mudam por aqui.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={80}
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-email">E-mail</Label>
          <Input
            id="profile-email"
            value={email}
            readOnly
            disabled
            className="h-11 opacity-80"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-phone">Telefone</Label>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            placeholder="(00) 00000-0000"
            className="h-11"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-birth">Data de nascimento</Label>
          <Input
            id="profile-birth"
            name="birth_date"
            type="date"
            defaultValue={birthDate ?? ""}
            className="h-11"
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Papel</dt>
            <dd className="mt-0.5 font-medium text-foreground">{roleLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Academia</dt>
            <dd className="mt-0.5 truncate font-medium text-foreground">
              {academyName}
            </dd>
          </div>
        </dl>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-primary text-primary-foreground"
        >
          {pending ? "Salvando…" : "Salvar dados"}
        </Button>
      </form>
    </section>
  );
}
