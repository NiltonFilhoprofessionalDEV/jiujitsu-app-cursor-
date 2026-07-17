import Link from "next/link";
import { redirect } from "next/navigation";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { OwnerInviteAdminForm } from "./owner-invite-admin-form";

export default async function AdminOwnerInvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    redirect("/home");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 py-8 lg:justify-center lg:py-16">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Admin</p>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-foreground">
          Convites de dono
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Gere um link para alguém criar uma academia no BJJ Pulse.
        </p>
      </header>

      <OwnerInviteAdminForm />

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
