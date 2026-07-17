import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMember } from "@/actions/members";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/types/domain";
import { EditMemberForm } from "../edit-member-form";

function assignableRoles(actorRole: MemberRole): MemberRole[] {
  if (actorRole === "owner") {
    return [
      "owner",
      "administrator",
      "instructor",
      "assistant_instructor",
      "student",
      "guardian",
    ];
  }
  if (actorRole === "administrator") {
    return [
      "administrator",
      "instructor",
      "assistant_instructor",
      "student",
      "guardian",
    ];
  }
  if (actorRole === "instructor") {
    return ["instructor", "assistant_instructor", "student", "guardian"];
  }
  return [];
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (
    !can(membership.role, "view_members") &&
    !can(membership.role, "manage_members")
  ) {
    redirect("/home");
  }

  let member;
  try {
    member = await getMember(id);
  } catch {
    redirect("/select-academy");
  }

  if (!member) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/members"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Membros
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          {member.profile.name}
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Detalhes e edição do membro
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
        <EditMemberForm
          member={member}
          assignableRoles={assignableRoles(membership.role)}
          canEdit={can(membership.role, "manage_members")}
        />
      </div>
    </div>
  );
}
