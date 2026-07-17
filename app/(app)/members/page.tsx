import Link from "next/link";
import { redirect } from "next/navigation";
import { listMembers } from "@/actions/members";
import { PageCreateFab } from "@/components/layout/page-create-fab";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { MemberListCard } from "./member-list-card";
import { MembersFilterBar } from "./members-filter-bar";
import { MembersInvitePanel } from "./members-invite-panel";

type SearchParams = Promise<{
  role?: string;
  status?: string;
  belt?: string;
  q?: string;
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

  const statusParam = params.status;
  const statusFilter =
    statusParam === "all"
      ? undefined
      : statusParam === undefined || statusParam === ""
        ? "active"
        : statusParam;

  let members;
  try {
    members = await listMembers({
      role: params.role,
      status: statusFilter,
      belt: params.belt,
      q: params.q,
    });
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Membros"
        description="Alunos e equipe da academia"
      />

      <MembersFilterBar
        initial={{
          q: params.q,
          role: params.role,
          status: statusParam ?? "active",
          belt: params.belt,
        }}
      />

      {canManage ? <MembersInvitePanel /> : null}

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Resultados
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {members.length}
          </p>
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-[var(--surface-shadow)]">
            <p className="text-sm text-muted-foreground">
              Nenhum membro encontrado com esses filtros.
            </p>
            {canManage ? (
              <Link
                href="/members/new"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--page-fab-bg)] text-sm font-medium text-[var(--page-fab-fg)] hover:brightness-110"
              >
                Novo membro
              </Link>
            ) : null}
          </div>
        ) : (
          members.map((member) => (
            <MemberListCard key={member.id} member={member} />
          ))
        )}
      </div>

      {canManage ? <PageCreateFab href="/members/new" label="Novo" /> : null}
    </div>
  );
}
