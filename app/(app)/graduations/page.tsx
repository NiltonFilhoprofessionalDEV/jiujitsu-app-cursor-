import { redirect } from "next/navigation";
import type { GraduationRow } from "@/actions/graduations";
import { listGraduations } from "@/actions/graduations";
import { listMembers } from "@/actions/members";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { GraduationHistoryCard } from "./graduation-history-card";
import { GraduationsFilterBar } from "./graduations-filter-bar";
import { NewGraduationSheetLazy as NewGraduationSheet } from "./new-graduation-sheet-lazy";

function withPreviousBelt(graduations: GraduationRow[]) {
  return graduations.map((graduation) => {
    const siblings = graduations.filter(
      (item) => item.member_id === graduation.member_id,
    );
    const index = siblings.findIndex((item) => item.id === graduation.id);
    const previous = index >= 0 ? siblings[index + 1] : undefined;

    return {
      ...graduation,
      previous_belt: previous?.belt ?? null,
      previous_degree: previous?.degree ?? null,
    };
  });
}

function applyFilters(
  graduations: ReturnType<typeof withPreviousBelt>,
  filters: { q?: string; belt?: string; from?: string; to?: string },
) {
  const q = filters.q?.trim().toLowerCase();
  return graduations.filter((item) => {
    if (q && !item.member_name.toLowerCase().includes(q)) return false;
    if (filters.belt && item.belt !== filters.belt) return false;
    if (filters.from && item.graduated_at < filters.from) return false;
    if (filters.to && item.graduated_at > filters.to) return false;
    return true;
  });
}

export default async function GraduationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    member?: string;
    new?: string;
    q?: string;
    belt?: string;
    from?: string;
    to?: string;
  }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canGraduate = can(membership.role, "graduate");
  if (!canGraduate && !can(membership.role, "view_members")) {
    redirect("/home");
  }

  const params = await searchParams;

  let graduations: GraduationRow[] = [];
  let members: Awaited<ReturnType<typeof listMembers>> = [];

  try {
    graduations = await listGraduations();
    if (canGraduate) {
      members = await listMembers({ status: "active" });
    }
  } catch {
    redirect("/select-academy");
  }

  const memberOptions = members.map((m) => ({
    id: m.id,
    name: m.profile.name,
    current_belt: m.current_belt,
    current_degree: m.current_degree,
  }));

  const withPrevious = withPreviousBelt(graduations);
  const filtered = applyFilters(withPrevious, {
    q: params.q,
    belt: params.belt,
    from: params.from,
    to: params.to,
  });

  const hasActiveFilters = Boolean(
    params.q?.trim() || params.belt || params.from || params.to,
  );
  const openNewSheet =
    canGraduate && (params.new === "1" || Boolean(params.member));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Graduações"
        description="Histórico permanente — faixas nunca somem"
      />

      <GraduationsFilterBar
        initial={{
          q: params.q,
          belt: params.belt,
          from: params.from,
          to: params.to,
        }}
      />

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Histórico
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {filtered.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "Nenhuma graduação encontrada"
                : "Nenhuma faixa no mural"
            }
            description={
              hasActiveFilters
                ? "Ajuste os filtros ou limpe para ver o histórico completo."
                : "Cada promoção fica permanente. Registre a primeira quando o aluno subir de grau."
            }
            actionHref={
              canGraduate && !hasActiveFilters
                ? "/graduations?new=1"
                : undefined
            }
            actionLabel={
              canGraduate && !hasActiveFilters
                ? "Registrar primeira graduação"
                : undefined
            }
          />
        ) : (
          filtered.map((graduation) => (
            <GraduationHistoryCard
              key={graduation.id}
              graduation={graduation}
            />
          ))
        )}
      </section>

      {canGraduate ? (
        <NewGraduationSheet
          members={memberOptions}
          defaultMemberId={params.member}
          defaultOpen={openNewSheet}
        />
      ) : null}
    </div>
  );
}
