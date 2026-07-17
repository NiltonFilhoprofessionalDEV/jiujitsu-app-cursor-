import { redirect } from "next/navigation";
import { logout } from "@/actions/auth";
import { ROLE_LABELS } from "@/app/(app)/members/labels";
import { getActiveMembership } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ProfilePage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, avatar_url")
    .eq("id", membership.profile_id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
          Perfil
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Sua conta no BJJ Manager
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--action-red)]/20 font-display text-xl text-[var(--action-red)]">
            {(profile?.name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {profile?.name ?? "Usuário"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile?.email ?? user?.email}
            </p>
          </div>
        </div>

        <dl className="space-y-3 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Papel</dt>
            <dd className="font-medium text-foreground">
              {ROLE_LABELS[membership.role]}
            </dd>
          </div>
          {profile?.phone ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium text-foreground">{profile.phone}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <ThemeToggle />

      <form action={logout}>
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full border-border"
        >
          Sair
        </Button>
      </form>
    </div>
  );
}
