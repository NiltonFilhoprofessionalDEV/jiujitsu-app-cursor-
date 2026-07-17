"use client";

import Link from "next/link";
import useSWR from "swr";
import type { AcademyMemberRow } from "@/actions/members";
import { fetchMembersList } from "@/actions/swr-data";
import { PageCreateFab } from "@/components/layout/page-create-fab";
import { MemberListCard } from "@/app/(app)/members/member-list-card";
import { swrKeys } from "@/lib/swr/keys";

export function MembersListClient({
  initialMembers,
  filters,
  canManage,
}: {
  initialMembers: AcademyMemberRow[];
  filters: {
    role?: string;
    status?: string;
    belt?: string;
    q?: string;
  };
  canManage: boolean;
}) {
  const { data: members = initialMembers } = useSWR(
    swrKeys.members(filters),
    () => fetchMembersList(filters),
    { fallbackData: initialMembers },
  );

  return (
    <>
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
    </>
  );
}
