import { redirect } from "next/navigation";
import { getStatsCharts } from "@/actions/dashboard";
import { StatsCharts } from "@/components/dashboard/stats-charts";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

export default async function StatsPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_dashboard")) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Estatísticas
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Relatórios da academia
          </p>
        </header>
        <div className="rounded-2xl border border-border bg-card p-8 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Os gráficos de gestão estão disponíveis para instrutores e
            administradores.
          </p>
        </div>
      </div>
    );
  }

  let charts;
  try {
    charts = await getStatsCharts();
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Estatísticas
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Faixas, presença, crescimento e graduações
        </p>
      </header>
      <StatsCharts {...charts} />
    </div>
  );
}
