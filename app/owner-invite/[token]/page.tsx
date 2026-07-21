import Link from "next/link";
import { logout } from "@/actions/auth";
import { getOwnerInvitePreview } from "@/actions/owner-invites";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { Button } from "@/components/ui/button";
import { normalizeEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { AcceptOwnerInviteButton } from "./accept-button";

type Params = Promise<{ token: string }>;

export default async function OwnerInvitePage({ params }: { params: Params }) {
  const { token } = await params;
  const preview = await getOwnerInvitePreview(token);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!preview) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center backdrop-blur-xl">
          <BlackBeltTitle className="font-display text-xl tracking-[0.06em] text-[var(--bjj-text)]">
            Convite inválido
          </BlackBeltTitle>
          <p className="mt-2 text-sm text-[var(--bjj-muted)]">
            Este link não existe ou foi removido.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  const next = `/owner-invite/${token}`;
  const expectedEmail = preview.expectedEmail;
  const userEmail = normalizeEmail(user?.email);
  const emailMismatch =
    Boolean(user && expectedEmail) && userEmail !== expectedEmail;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <header className="space-y-2 text-center">
          <p className="text-sm font-medium text-primary">BJJ Pulse</p>
          <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
            Criar sua academia
          </BlackBeltTitle>
          <p className="text-sm text-[var(--bjj-muted)]">
            Este convite libera você como <strong>dono</strong> para cadastrar
            uma academia nova.
          </p>
          {expectedEmail ? (
            <p className="text-sm text-foreground">
              Autorizado para: <strong>{expectedEmail}</strong>
            </p>
          ) : null}
        </header>

        {!preview.isValid ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            Este convite expirou ou atingiu o limite de usos.
          </p>
        ) : emailMismatch ? (
          <div className="space-y-3">
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
            >
              Você está logado como {user?.email}. Este convite é exclusivo de{" "}
              {expectedEmail}.
            </p>
            <form action={logout}>
              <Button type="submit" variant="outline" className="h-11 w-full">
                Sair e entrar com o e-mail correto
              </Button>
            </form>
          </div>
        ) : user ? (
          <AcceptOwnerInviteButton token={token} />
        ) : (
          <div className="space-y-3">
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar conta e continuar
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium text-[var(--bjj-text)] hover:bg-muted"
            >
              Já tenho conta — Entrar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
