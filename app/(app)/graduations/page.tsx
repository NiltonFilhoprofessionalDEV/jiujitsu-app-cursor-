import { redirect } from "next/navigation";
import {
  listEligibleGraduationCandidates,
} from "@/actions/graduation-eligibility";
import type { GraduationRow } from "@/actions/graduations";
import { listGraduations } from "@/actions/graduations";
import { listMembers } from "@/actions/members";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { withPreviousBelt } from "@/lib/graduations/with-previous-belt";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EligibleGraduationsPanel } from "./eligible-graduations-panel";
import { GraduationHistoryCard } from "./graduation-history-card";
import { GraduationsFilterBar } from "./graduations-filter-bar";
import { GraduationsPagination } from "./graduations-pagination";
import { NewGraduationSheetLazy as NewGraduationSheet } from "./new-graduation-sheet-lazy";

const PAGE_SIZE = 12;

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

function sortNewestFirst<T extends { graduated_at: string; id: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const byDate = b.graduated_at.localeCompare(a.graduated_at);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
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
    page?: string;
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
  let eligible: Awaited<
    ReturnType<typeof listEligibleGraduationCandidates>
  > = [];

  try {
    graduations = await listGraduations();
    if (canGraduate) {
      members = await listMembers({ status: "active" });
      eligible = await listEligibleGraduationCandidates();
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
  const filtered = sortNewestFirst(
    applyFilters(withPrevious, {
      q: params.q,
      belt: params.belt,
      from: params.from,
      to: params.to,
    }),
  );

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(parsePage(params.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const hasActiveFilters = Boolean(
    params.q?.trim() || params.belt || params.from || params.to,
  );
  const openNewSheet =
    canGraduate && (params.new === "1" || Boolean(params.member));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Graduações"
        description={
          canGraduate
            ? "Histórico de faixas — edite ou apague se errar"
            : "Histórico permanente de faixas e graus"
        }
      />

      {canGraduate ? <EligibleGraduationsPanel candidates={eligible} /> : null}

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
            {totalItems}
          </p>
        </div>

        {totalItems === 0 ? (
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
          <>
            {pageItems.map((graduation) => (
              <GraduationHistoryCard
                key={graduation.id}
                graduation={graduation}
                canManage={canGraduate}
              />
            ))}
            <GraduationsPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              query={{
                q: params.q,
                belt: params.belt,
                from: params.from,
                to: params.to,
              }}
            />
          </>
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
