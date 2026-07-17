"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = null;

export function SignupForm({
  next,
  lockedEmail,
  defaultName,
}: {
  next?: string;
  lockedEmail?: string | null;
  defaultName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div className="auth-rise auth-rise-delay-2 space-y-5">
      <div className="auth-panel rounded-2xl p-6">
        <form action={formAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              defaultValue={defaultName ?? ""}
              placeholder="Seu nome"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={lockedEmail ?? ""}
              readOnly={Boolean(lockedEmail)}
              placeholder="voce@email.com"
              className={
                lockedEmail
                  ? "h-11 bg-muted text-muted-foreground"
                  : "h-11"
              }
            />
            {lockedEmail ? (
              <p className="text-[11px] text-muted-foreground">
                Este convite está vinculado a este e-mail.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
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
          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-primary text-base font-semibold tracking-wide text-primary-foreground shadow-[0_0_24px_var(--fab-glow)] transition hover:bg-primary/90 hover:shadow-[0_0_32px_var(--fab-glow)]"
          >
            {pending ? "Criando…" : "Criar conta"}
          </Button>
        </form>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
