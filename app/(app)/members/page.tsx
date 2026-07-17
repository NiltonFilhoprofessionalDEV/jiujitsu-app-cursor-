import Link from "next/link";
import { redirect } from "next/navigation";
import { listMembers } from "@/actions/members";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { BELT_OPTIONS } from "@/lib/validations/members";
import {
  ROLE_LABELS,
  ROLE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  selectClassName,
} from "./labels";
import { CreateInviteForm } from "./create-invite-form";

type SearchParams = Promise<{
  role?: string;
  status?: string;
  belt?: string;
}>;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const params = await searchParams;
  const canManage = can(membership.role, "manage_members");

  let members;
  try {
    members = await listMembers({
      role: params.role,
      status: params.status,
      belt: params.belt,
    });
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Membros
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Alunos e equipe da academia
          </p>
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-2">
            <Link
              href="/members/new"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Vincular
            </Link>
          </div>
        ) : null}
      </header>

      {canManage ? <CreateInviteForm /> : null}

      <form
        className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl"
        method="get"
      >
        <div className="space-y-1">
          <label htmlFor="role" className="text-[10px] text-muted-foreground">
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue={params.role ?? ""}
            className={selectClassName}
          >
            <option value="">Todos</option>
            {ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-[10px] text-muted-foreground">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className={selectClassName}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="belt" className="text-[10px] text-muted-foreground">
            Faixa
          </label>
          <select
            id="belt"
            name="belt"
            defaultValue={params.belt ?? ""}
            className={selectClassName}
          >
            <option value="">Todas</option>
            {BELT_OPTIONS.map((belt) => (
              <option key={belt} value={belt}>
                {belt}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="col-span-3 mt-1 h-10 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-foreground hover:bg-white/10"
        >
          Filtrar
        </button>
      </form>

      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              Nenhum membro encontrado com esses filtros.
            </p>
            {canManage ? (
              <Link
                href="/members/new"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Vincular por e-mail
              </Link>
            ) : null}
          </div>
        ) : (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {member.profile.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.profile.email}
                  </p>
                </div>
                <span
                  className={
                    member.status === "active"
                      ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                      : member.status === "suspended"
                        ? "shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400"
                        : "shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  }
                >
                  {STATUS_LABELS[member.status]}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {ROLE_LABELS[member.role]}
                {member.current_belt
                  ? ` · ${member.current_belt}${member.current_degree > 0 ? ` ${member.current_degree}º` : ""}`
                  : ""}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
