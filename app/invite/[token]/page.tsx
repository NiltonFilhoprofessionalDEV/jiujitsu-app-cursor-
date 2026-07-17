import Link from "next/link";
import { getInvitePreview } from "@/actions/invites";
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
          <h1 className="text-xl font-semibold text-[var(--bjj-text)]">
            Convite inválido
          </h1>
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <div className="space-y-6 rounded-2xl border border-border bg-card p-6 backdrop-blur-xl">
        <header className="space-y-2 text-center">
          <p className="text-sm font-medium text-primary">BJJ Manager</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            {preview.academyName}
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Você foi convidado como{" "}
            <strong>{ROLE_LABELS[preview.role] ?? preview.role}</strong>
          </p>
        </header>

        {!preview.isValid ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            Este convite expirou ou atingiu o limite de usos.
          </p>
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
