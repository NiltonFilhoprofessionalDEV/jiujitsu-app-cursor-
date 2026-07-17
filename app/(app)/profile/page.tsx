import { redirect } from "next/navigation";
import { ROLE_LABELS } from "@/app/(app)/members/labels";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileAvatarUpload } from "@/components/profile/profile-avatar-upload";
import { ProfileBeltCard } from "@/components/profile/profile-belt-card";
import { ProfileEditableSection } from "@/components/profile/profile-editable-section";
import { ProfilePreferences } from "@/components/profile/profile-preferences";
import { getPushReminderStatus } from "@/actions/push";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { getActiveMembership } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  let membership;
  let academy;
  try {
    [membership, academy] = await Promise.all([
      getActiveMembership(),
      getActiveAcademyBrief(),
    ]);
  } catch {
    redirect("/select-academy");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: memberRow }, { data: privateDetails }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name, email, phone, avatar_url, birth_date")
        .eq("id", membership.profile_id)
        .maybeSingle(),
      supabase
        .from("academy_members")
        .select("current_belt, current_degree, joined_at")
        .eq("id", membership.id)
        .maybeSingle(),
      supabase
        .from("member_private_details")
        .select("emergency_contact_name, emergency_contact_phone")
        .eq("member_id", membership.id)
        .maybeSingle(),
    ]);

  const displayName = profile?.name ?? "Usuário";
  const initial = (displayName || user?.email || "?").slice(0, 1).toUpperCase();
  const pushStatus =
    membership.role === "student" ? await getPushReminderStatus() : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={academy.name}
        title="Perfil"
        description="Seus dados e preferências"
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
      </section>

      <ProfileBeltCard
        belt={memberRow?.current_belt ?? null}
        degree={
          typeof memberRow?.current_degree === "number"
            ? memberRow.current_degree
            : null
        }
        joinedAt={memberRow?.joined_at ?? null}
      />

      <ProfileEditableSection
        name={displayName}
        email={profile?.email ?? user?.email ?? ""}
        phone={profile?.phone ?? null}
        birthDate={profile?.birth_date ?? null}
        roleLabel={ROLE_LABELS[membership.role]}
        academyName={academy.name}
        emergencyName={privateDetails?.emergency_contact_name ?? null}
        emergencyPhone={privateDetails?.emergency_contact_phone ?? null}
      />

      <ProfilePreferences push={pushStatus} />
    </div>
  );
}
