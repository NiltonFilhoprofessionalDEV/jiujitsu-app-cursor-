import { redirect } from "next/navigation";
import { getStatsCharts } from "@/actions/dashboard";
import { StatsChartsLazy as StatsCharts } from "@/components/dashboard/stats-charts-lazy";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveAcademyBrief } from "@/lib/academy/active";
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
    let academy;
    try {
      academy = await getActiveAcademyBrief();
    } catch {
      redirect("/select-academy");
    }

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={academy.name}
          title="Estatísticas"
          description="Leitura do tatame"
        />
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <p className="font-display text-lg tracking-[0.08em] text-foreground">
            Relatórios da equipe
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gráficos de gestão ficam disponíveis para instrutores e
            administradores.
          </p>
        </div>
      </div>
    );
  }

  let academy;
  let charts;
  try {
    [academy, charts] = await Promise.all([
      getActiveAcademyBrief(),
      getStatsCharts(),
    ]);
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={academy.name}
        title="Estatísticas"
        description="Faixas, presença e ritmo da academia"
      />
      <StatsCharts {...charts} />
    </div>
  );
}
