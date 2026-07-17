import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/types/domain";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { NewMemberForm } from "../new-member-form";

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

export default async function NewMemberPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_members")) {
    redirect("/members");
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
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
          Novo aluno
        </BlackBeltTitle>
        <p className="text-sm text-[var(--bjj-muted)]">
          Cadastre na academia e envie o acesso por WhatsApp ou e-mail
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
        <NewMemberForm assignableRoles={assignableRoles(membership.role)} />
      </div>
    </div>
  );
}
