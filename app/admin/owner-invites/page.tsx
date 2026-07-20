import Link from "next/link";
import { listOwnerInvites } from "@/actions/owner-invites";
import { assertPlatformAdminAccess } from "@/actions/platform-admin";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { OwnerInviteAdminForm } from "./owner-invite-admin-form";

export default async function AdminOwnerInvitesPage() {
  await assertPlatformAdminAccess();
  const invites = await listOwnerInvites();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 py-8 lg:justify-center lg:py-16">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Admin</p>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-foreground">
          Autorizar donos
        </BlackBeltTitle>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail do cliente e gere um link exclusivo para ele criar a
          academia.
        </p>
      </header>

      <OwnerInviteAdminForm invites={invites} />

      <p className="space-x-4 text-center text-sm text-muted-foreground">
        <Link
          href="/admin"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Painel admin
        </Link>
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
