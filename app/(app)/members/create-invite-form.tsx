"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { createInvite, type InviteActionState } from "@/actions/invites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: InviteActionState = null;

function InviteShareCard({
  inviteUrl,
  whatsappUrl,
  message,
}: {
  inviteUrl: string;
  whatsappUrl: string;
  message: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--member-invite-success-border)] bg-[var(--member-invite-success-bg)]">
      <div className="flex items-start gap-3 px-3.5 pt-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--member-invite-success-fg)]/15 text-[var(--member-invite-success-fg)]">
          <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Convite pronto
          </p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>

      <div className="mx-3.5 mt-3 rounded-xl border border-border bg-background/60 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Link do convite
        </p>
        <p className="mt-1 truncate font-mono text-xs text-foreground">
          {inviteUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-xl",
            "bg-[var(--member-invite-wa-bg)] text-sm font-semibold text-[var(--member-invite-wa-fg)]",
            "transition active:scale-[0.98] hover:brightness-110",
          )}
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card",
            "text-sm font-semibold text-foreground transition active:scale-[0.98] hover:bg-muted",
            copied && "border-[var(--member-invite-success-border)] text-[var(--member-invite-success-fg)]",
          )}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copiar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function CreateInviteForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createInvite, initialState);

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "space-y-4 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl"
      }
    >
      {!compact ? (
        <div>
          <h2 className="text-base font-semibold text-[var(--bjj-text)]">
            Convidar pelo WhatsApp
          </h2>
          <p className="text-xs text-[var(--bjj-muted)]">
            Gere um link para o aluno se cadastrar sozinho
          </p>
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="role">Função</Label>
          <select
            id="role"
            name="role"
            defaultValue="student"
            className="flex h-10 w-full rounded-lg border border-border bg-black/20 px-3 text-sm text-[var(--bjj-text)]"
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

        {state?.success && state.inviteUrl && state.whatsappUrl ? (
          <InviteShareCard
            inviteUrl={state.inviteUrl}
            whatsappUrl={state.whatsappUrl}
            message="Compartilhe no WhatsApp ou copie o link."
          />
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-primary text-primary-foreground"
        >
          {pending ? "Gerando…" : "Gerar convite"}
        </Button>
      </form>
    </div>
  );
}
