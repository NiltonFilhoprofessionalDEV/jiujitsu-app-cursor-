import Link from "next/link";
import { logout } from "@/actions/auth";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { Button } from "@/components/ui/button";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export default async function WaitingAcademyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isPlatformAdminEmail(user?.email);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      <header className="space-y-2 text-center">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          BJJ Pulse
        </p>
        <BlackBeltTitle className="text-lg font-medium text-muted-foreground">
          Quase lá
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Para entrar, peça o <strong>link de convite</strong> da sua academia.
          Novas academias só são criadas com um convite de dono.
        </p>
      </header>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-6 text-center shadow-xl backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">
          Já tem um link? Abra ele no navegador (WhatsApp ou e-mail) com esta
          conta logada.
        </p>

        {isAdmin ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <Link
              href="/admin/owner-invites"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Gerar convites de dono
            </Link>
            <Link
              href="/create-academy"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              Criar academia (admin)
            </Link>
          </div>
        ) : null}

        <form action={logout}>
          <Button type="submit" variant="outline" className="h-11 w-full">
            Sair da conta
          </Button>
        </form>
        <Link
          href="/login"
          className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
