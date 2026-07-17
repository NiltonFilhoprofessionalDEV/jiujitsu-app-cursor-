import Link from "next/link";
import { getInvitePreview } from "@/actions/invites";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "./accept-button";

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  guardian: "Responsável",
  assistant_instructor: "Auxiliar",
  instructor: "Professor",
};

type Params = Promise<{ token: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { token } = await params;
  const preview = await getInvitePreview(token);

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

  const next = `/invite/${token}`;
  const userEmail = user?.email?.trim().toLowerCase() ?? null;
  const emailMismatch =
    Boolean(preview.expectedEmail) &&
    Boolean(userEmail) &&
    userEmail !== preview.expectedEmail;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <header className="space-y-2 text-center">
          <p className="text-sm font-medium text-primary">BJJ Pulse</p>
          <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
            {preview.academyName}
          </BlackBeltTitle>
          <p className="text-sm text-[var(--bjj-muted)]">
            {preview.inviteeName
              ? `${preview.inviteeName}, você foi convidado como `
              : "Você foi convidado como "}
            <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong>
          </p>
          {preview.expectedEmail ? (
            <p className="text-xs text-muted-foreground">
              E-mail do convite: {preview.expectedEmail}
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
              Você está logado como {userEmail}, mas este convite é para{" "}
              {preview.expectedEmail}. Saia e entre com o e-mail correto.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Entrar com o e-mail do convite
            </Link>
          </div>
        ) : user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="space-y-3">
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar conta e entrar
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
