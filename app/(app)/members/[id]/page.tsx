import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Award, MessageCircle, Phone, Users } from "lucide-react";
import { getMember } from "@/actions/members";
import { beltNeedsDarkInk, beltSwatch } from "@/lib/belts/colors";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types/domain";
import { EditMemberForm } from "../edit-member-form";
import { ROLE_LABELS, STATUS_LABELS } from "../labels";

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

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function whatsappHref(phone: string): string {
  const digits = digitsOnly(phone);
  const withCountry =
    digits.length >= 10 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
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

  const canManage = can(membership.role, "manage_members");
  const canGraduate = can(membership.role, "graduate");
  const canManageClasses = can(membership.role, "manage_classes");
  const phone = member.profile.phone?.trim() || null;
  const belt = member.current_belt;
  const darkInk = beltNeedsDarkInk(belt);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link
          href="/members"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Membros
        </Link>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
                {member.profile.name}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {member.profile.email}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {ROLE_LABELS[member.role]}
                </span>
                <span
                  className={
                    member.status === "active"
                      ? "rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                      : "rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  }
                >
                  {STATUS_LABELS[member.status]}
                </span>
              </div>
            </div>

            {belt ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  darkInk ? "text-neutral-900" : "text-white",
                )}
                style={{ background: beltSwatch(belt) }}
              >
                {belt}
                {member.current_degree > 0
                  ? ` · ${member.current_degree}º`
                  : ""}
              </span>
            ) : null}
          </div>

          {phone ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`tel:${digitsOnly(phone)}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/50 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Phone className="h-4 w-4" />
                Ligar
              </a>
              <a
                href={whatsappHref(phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-medium text-white hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Sem telefone cadastrado no perfil.
            </p>
          )}
        </div>
      </header>

      {(canGraduate || canManageClasses) && member.role === "student" ? (
        <section className="grid grid-cols-2 gap-2">
          {canGraduate ? (
            <Link
              href={`/graduations?member=${member.id}`}
              className="flex min-h-[4.25rem] flex-col justify-between rounded-xl bg-[var(--action-red)] px-3 py-3 text-primary-foreground transition hover:brightness-110"
            >
              <Award className="h-4 w-4 opacity-90" />
              <div>
                <p className="text-sm font-semibold">Graduar</p>
                <p className="text-[10px] opacity-80">Faixa e grau</p>
              </div>
            </Link>
          ) : null}
          {canManageClasses ? (
            <Link
              href="/classes"
              className="flex min-h-[4.25rem] flex-col justify-between rounded-xl border border-border bg-card px-3 py-3 text-foreground transition hover:bg-muted"
            >
              <Users className="h-4 w-4 opacity-90" />
              <div>
                <p className="text-sm font-semibold">Matricular</p>
                <p className="text-[10px] text-muted-foreground">
                  Abrir turmas
                </p>
              </div>
            </Link>
          ) : null}
        </section>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <h2 className="mb-3 font-display text-lg tracking-[0.1em] text-foreground">
          Dados
        </h2>
        <EditMemberForm
          member={member}
          assignableRoles={assignableRoles(membership.role)}
          canEdit={canManage}
        />
      </div>
    </div>
  );
}
