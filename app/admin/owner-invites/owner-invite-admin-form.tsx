"use client";

import { useActionState } from "react";
import {
  createOwnerInvite,
  grantSelfCreateAcademy,
  type OwnerInviteActionState,
} from "@/actions/owner-invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OwnerInviteActionState = null;

export function OwnerInviteAdminForm() {
  const [state, formAction, pending] = useActionState(
    createOwnerInvite,
    initialState,
  );
  const [grantState, grantAction, grantPending] = useActionState(
    async () => grantSelfCreateAcademy(),
    null as OwnerInviteActionState,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Validade (dias)</Label>
              <Input
                id="expiresInDays"
                name="expiresInDays"
                type="number"
                min={1}
                max={90}
                defaultValue={7}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUses">Máx. usos</Label>
              <Input
                id="maxUses"
                name="maxUses"
                type="number"
                min={1}
                max={50}
                defaultValue={1}
                className="h-11"
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
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-foreground">{state.success}</p>
              <p className="break-all text-muted-foreground">{state.inviteUrl}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    void navigator.clipboard.writeText(state.inviteUrl!);
                  }}
                >
                  Copiar link
                </Button>
                {state.whatsappUrl ? (
                  <a
                    href={state.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Abrir WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {pending ? "Gerando…" : "Gerar convite de dono"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xl backdrop-blur-xl">
        <p className="mb-3 text-sm text-muted-foreground">
          Ou liberar sua própria conta para criar uma academia agora.
        </p>
        {grantState?.error ? (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {grantState.error}
          </p>
        ) : null}
        <form action={grantAction}>
          <Button
            type="submit"
            variant="outline"
            disabled={grantPending}
            className="h-11 w-full"
          >
            {grantPending ? "Liberando…" : "Liberar minha conta"}
          </Button>
        </form>
      </div>
    </div>
  );
}
