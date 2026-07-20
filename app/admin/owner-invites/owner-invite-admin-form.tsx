"use client";

import { useActionState } from "react";
import {
  createOwnerInvite,
  grantSelfCreateAcademy,
  revokeOwnerInvite,
  type OwnerInviteActionState,
  type OwnerInviteListItem,
} from "@/actions/owner-invites";
import { revokeCreateAcademyAccess } from "@/actions/platform-admin-mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OwnerInviteActionState = null;

function inviteStatus(invite: OwnerInviteListItem): string {
  if (!invite.isActive) return "Revogado";
  if (invite.usedCount >= invite.maxUses) return "Usado";
  if (new Date(invite.expiresAt).getTime() <= Date.now()) return "Expirado";
  return "Pendente";
}

export function OwnerInviteAdminForm({
  invites,
}: {
  invites: OwnerInviteListItem[];
}) {
  const [state, formAction, pending] = useActionState(
    createOwnerInvite,
    initialState,
  );
  const [grantState, grantAction, grantPending] = useActionState(
    async () => grantSelfCreateAcademy(),
    null as OwnerInviteActionState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeOwnerInvite,
    initialState,
  );
  const [accessState, accessAction, accessPending] = useActionState(
    revokeCreateAcademyAccess,
    null as { error?: string; success?: string } | null,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail autorizado *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="cliente@email.com"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Só este e-mail poderá aceitar o link e criar a academia como dono.
            </p>
          </div>

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
            {pending ? "Gerando…" : "Autorizar e gerar link"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Convites recentes
        </h2>
        {revokeState?.error || revokeState?.success ? (
          <p
            role="status"
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              revokeState.error
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-muted/40 text-foreground"
            }`}
          >
            {revokeState.error ?? revokeState.success}
          </p>
        ) : null}
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite ainda.</p>
        ) : (
          <ul className="space-y-3">
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              const canRevoke =
                invite.isActive && invite.usedCount < invite.maxUses;
              return (
                <li
                  key={invite.id}
                  className="rounded-xl border border-border bg-muted/20 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {invite.expectedEmail ?? "Sem e-mail"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {status} · expira{" "}
                        {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {canRevoke ? (
                      <form action={revokeAction}>
                        <input
                          type="hidden"
                          name="inviteId"
                          value={invite.id}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          disabled={revokePending}
                          className="h-9"
                        >
                          Revogar
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-xl">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Revogar acesso pendente de criação
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Remove `can_create_academy` de alguém que já aceitou o convite mas
          ainda não criou a academia.
        </p>
        <form action={accessAction} className="space-y-3">
          <Input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className="h-11"
          />
          {accessState?.error || accessState?.success ? (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-sm ${
                accessState.error
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-foreground"
              }`}
            >
              {accessState.error ?? accessState.success}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={accessPending}
            className="h-11 w-full"
          >
            {accessPending ? "Revogando…" : "Revogar acesso de criação"}
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
