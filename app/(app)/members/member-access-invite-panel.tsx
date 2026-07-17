"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  resendMemberInvite,
  type InviteActionState,
} from "@/actions/invites";
import { Button } from "@/components/ui/button";

const initialState: InviteActionState = null;

export function MemberAccessInvitePanel({
  memberId,
  hasEmail,
}: {
  memberId: string;
  hasEmail: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    resendMemberInvite,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <section className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-[var(--surface-shadow)]">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Acesso ao app
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este aluno ainda não criou conta. Gere o convite e envie pelo
          WhatsApp ou e-mail.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="member_id" value={memberId} />
        {hasEmail ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="send_email" value="on" />
            Tentar enviar e-mail automaticamente
          </label>
        ) : null}
        <Button type="submit" disabled={pending} className="h-11 w-full">
          {pending ? "Gerando…" : "Gerar / reenviar convite"}
        </Button>
      </form>

      {state?.inviteUrl ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="break-all text-xs text-muted-foreground">
            {state.inviteUrl}
          </p>
          <div className="grid gap-2">
            {state.whatsappUrl ? (
              <a
                href={state.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#25D366] text-sm font-semibold text-white"
              >
                Enviar no WhatsApp
              </a>
            ) : null}
            {state.mailtoUrl ? (
              <a
                href={state.mailtoUrl}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card text-sm font-medium"
              >
                Abrir e-mail
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11"
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
              {copied ? "Copiado" : "Copiar link"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
