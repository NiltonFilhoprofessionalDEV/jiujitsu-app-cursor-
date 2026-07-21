import Link from "next/link";
import { assertPlatformAdminAccess } from "@/actions/platform-admin";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";

export default async function AdminHomePage() {
  await assertPlatformAdminAccess();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 py-8 lg:justify-center lg:py-16">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Platform Admin</p>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-foreground">
          Painel BJJ Pulse
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Autorize donos por e-mail, gerencie academias e suspenda acessos.
        </p>
      </header>

      <nav className="space-y-3">
        <Link
          href="/admin/owner-invites"
          className="block rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl transition hover:bg-muted/40"
        >
          <p className="font-semibold text-foreground">Autorizar donos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere um link exclusivo para um e-mail criar e administrar uma
            academia.
          </p>
        </Link>
        <Link
          href="/admin/academies"
          className="block rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl transition hover:bg-muted/40"
        >
          <p className="font-semibold text-foreground">Academias</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Liste, edite, suspenda por falta de pagamento e veja membros/roles.
          </p>
        </Link>
      </nav>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/home"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Voltar ao app
        </Link>
      </p>
    </div>
  );
}
