"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ProfileEmergencyForm } from "@/components/profile/profile-emergency-form";
import { ProfilePersonalForm } from "@/components/profile/profile-personal-form";
import { Button } from "@/components/ui/button";

function formatBirthDate(value: string | null): string {
  if (!value) return "Não informado";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

export function ProfileEditableSection({
  name,
  email,
  phone,
  birthDate,
  roleLabel,
  academyName,
  emergencyName,
  emergencyPhone,
}: {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  roleLabel: string;
  academyName: string;
  emergencyName: string | null;
  emergencyPhone: string | null;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3">
      {editing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm font-semibold text-foreground">Editar dados</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 text-muted-foreground"
              onClick={() => setEditing(false)}
            >
              <X className="h-4 w-4" />
              Fechar
            </Button>
          </div>

          <ProfilePersonalForm
            name={name}
            email={email}
            phone={phone}
            birthDate={birthDate}
            roleLabel={roleLabel}
            academyName={academyName}
          />

          <ProfileEmergencyForm
            contactName={emergencyName}
            contactPhone={emergencyPhone}
          />
        </div>
      ) : (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Meus dados
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Resumo pessoal e contato de emergência
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar dados
            </Button>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="truncate font-medium text-foreground">{name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium text-foreground">
                {phone || "Não informado"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Nascimento</dt>
              <dd className="font-medium text-foreground">
                {formatBirthDate(birthDate)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="text-muted-foreground">Emergência</dt>
              <dd className="max-w-[60%] text-right font-medium text-foreground">
                {emergencyName || emergencyPhone
                  ? [emergencyName, emergencyPhone].filter(Boolean).join(" · ")
                  : "Não informado"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <ChangePasswordForm />
    </div>
  );
}
