"use client";

import { useActionState } from "react";
import { createInvite, type InviteActionState } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: InviteActionState = null;

export function CreateInviteForm() {
  const [state, formAction, pending] = useActionState(createInvite, initialState);

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div>
        <h2 className="text-base font-semibold text-[var(--bjj-text)]">
          Convidar pelo WhatsApp
        </h2>
        <p className="text-xs text-[var(--bjj-muted)]">
          Gere um link para o aluno se cadastrar sozinho
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="role">Função</Label>
          <select
            id="role"
            name="role"
            defaultValue="student"
            className="flex h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-[var(--bjj-text)]"
          >
            <option value="student">Aluno</option>
            <option value="guardian">Responsável</option>
            <option value="assistant_instructor">Auxiliar</option>
            <option value="instructor">Professor</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="expiresInDays">Validade (dias)</Label>
            <Input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min={1}
              max={90}
              defaultValue={7}
              className="h-10"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxUses">Máx. usos</Label>
            <Input
              id="maxUses"
              name="maxUses"
              type="number"
              min={1}
              max={1000}
              defaultValue={100}
              className="h-10"
            />
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

        {state?.success && state.inviteUrl ? (
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            <p className="font-medium text-primary">{state.success}</p>
            <p className="break-all text-xs text-[var(--bjj-muted)]">
              {state.inviteUrl}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={state.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#25D366] text-sm font-medium text-black hover:opacity-90"
              >
                Abrir WhatsApp
              </a>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                onClick={() => {
                  void navigator.clipboard.writeText(state.inviteUrl!);
                }}
              >
                Copiar link
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-10 w-full bg-primary text-primary-foreground"
        >
          {pending ? "Gerando…" : "Gerar convite"}
        </Button>
      </form>
    </div>
  );
}
