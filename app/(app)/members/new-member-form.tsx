"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createManualMember,
  type MemberActionState,
} from "@/actions/members";
import type { MemberRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BELT_OPTIONS,
  ROLE_LABELS,
  STATUS_OPTIONS,
  selectClassName,
} from "./labels";

const initialState: MemberActionState = null;

export function NewMemberForm({
  assignableRoles,
}: {
  assignableRoles: MemberRole[];
}) {
  const [state, formAction, pending] = useActionState(
    createManualMember,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.error && !state.memberId) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  if (state?.memberId && state.inviteUrl) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-foreground">
          {state.success ?? "Aluno criado com sucesso."}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Link de acesso
          </p>
          <p className="break-all rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            {state.inviteUrl}
          </p>
        </div>

        <div className="grid gap-2">
          {state.whatsappUrl ? (
            <a
              href={state.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#25D366] text-base font-semibold text-white"
            >
              Enviar no WhatsApp
            </a>
          ) : null}

          {state.mailtoUrl ? (
            <a
              href={state.mailtoUrl}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card text-base font-medium"
            >
              {state.emailSent
                ? "E-mail enviado · abrir de novo"
                : "Abrir e-mail com convite"}
            </a>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
                toast.success("Link copiado");
              } catch {
                toast.error("Não foi possível copiar");
              }
            }}
          >
            {copied ? "Link copiado" : "Copiar link"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link
            href={`/members/${state.memberId}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium"
          >
            Ver aluno
          </Link>
          <Link
            href="/members/new"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground"
          >
            Adicionar outro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        O aluno entra na lista na hora. Depois você manda o convite pelo
        WhatsApp (ou e-mail) para ele criar a conta e acessar o app.
      </p>

      <div className="space-y-2">
        <Label htmlFor="name">Nome completo *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Nome do aluno"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp *</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          placeholder="11999998888"
          className="h-11"
        />
        <p className="text-[11px] text-muted-foreground">
          Com DDD. O botão abre o WhatsApp desse número com a mensagem pronta.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail (opcional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="aluno@email.com"
          className="h-11"
        />
      </div>

      <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          name="send_email"
          value="on"
          className="mt-1"
        />
        <span>
          Tentar enviar o convite por e-mail automaticamente
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            Se o envio automático não estiver configurado, você ainda pode abrir
            o e-mail com a mensagem pronta.
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="role">Papel</Label>
          <select
            id="role"
            name="role"
            defaultValue="student"
            className={selectClassName}
          >
            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue="active"
            className={selectClassName}
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="current_belt">Faixa</Label>
          <select
            id="current_belt"
            name="current_belt"
            defaultValue="Branca"
            className={selectClassName}
          >
            <option value="">Sem faixa</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="current_degree">Grau</Label>
          <Input
            id="current_degree"
            name="current_degree"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact_name">Contato de emergência</Label>
        <Input
          id="emergency_contact_name"
          name="emergency_contact_name"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact_phone">Telefone de emergência</Label>
        <Input
          id="emergency_contact_phone"
          name="emergency_contact_phone"
          type="tel"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medical_notes">Observações médicas</Label>
        <textarea
          id="medical_notes"
          name="medical_notes"
          rows={3}
          className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {state?.error && !state.memberId ? (
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
        className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {pending ? "Criando…" : "Criar aluno e gerar convite"}
      </Button>
    </form>
  );
}
