import { redirect } from "next/navigation";
import { ROLE_LABELS } from "@/app/(app)/members/labels";
import { PageHeader } from "@/components/layout/page-header";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ProfileAvatarUpload } from "@/components/profile/profile-avatar-upload";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { getActiveMembership } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  let membership;
  let academy;
  try {
    membership = await getActiveMembership();
    academy = await getActiveAcademyBrief();
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

  const displayName = profile?.name ?? "Usuário";
  const initial = (displayName || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={academy.name}
        title="Perfil"
        description="Seus dados na academia"
      />

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <ProfileAvatarUpload
            name={displayName}
            avatarUrl={profile?.avatar_url ?? null}
            initial={initial}
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile?.email ?? user?.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque na foto para alterar
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
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Academia</dt>
            <dd className="truncate font-medium text-foreground">
              {academy.name}
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

      <ChangePasswordForm />
    </div>
  );
}
