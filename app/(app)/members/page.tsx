import { redirect } from "next/navigation";
import { fetchMembersList } from "@/actions/swr-data";
import { PageHeader } from "@/components/layout/page-header";
import { MembersListClient } from "@/components/members/members-list-client";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
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

  const filters = {
    role: params.role,
    status: statusFilter,
    belt: params.belt,
    q: params.q,
  };

  let members;
  try {
    members = await fetchMembersList(filters);
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

      <MembersListClient
        initialMembers={members}
        filters={filters}
        canManage={canManage}
      />
    </div>
  );
}
