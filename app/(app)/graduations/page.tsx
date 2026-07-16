import { redirect } from "next/navigation";
import { listGraduations } from "@/actions/graduations";
import { listMembers } from "@/actions/members";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { NewGraduationForm } from "./new-graduation-form";

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export default async function GraduationsPage() {
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

  let graduations: Awaited<ReturnType<typeof listGraduations>> = [];
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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Graduações
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Histórico append-only — faixas nunca são apagadas
        </p>
      </header>

      {canGraduate ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-foreground">Nova graduação</h2>
          <NewGraduationForm members={memberOptions} />
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">Histórico</h2>
        {graduations.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              Nenhuma graduação registrada ainda.
            </p>
          </div>
        ) : (
          graduations.map((g) => (
            <article
              key={g.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {g.member_name}
                  </p>
                  <p className="mt-1 text-sm text-[var(--accent)]">
                    {g.belt} · grau {g.degree}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(g.graduated_at)}
                </time>
              </div>
              {g.notes ? (
                <p className="mt-2 text-xs text-muted-foreground">{g.notes}</p>
              ) : null}
              {g.awarded_by_name ? (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Por {g.awarded_by_name}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
