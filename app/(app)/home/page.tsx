import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import {
  CheckinQueueCard,
  MetricGlassCard,
  NextClassCard,
  NowOnMatBoard,
  QuickActions,
  RecentList,
} from "@/components/dashboard/home-widgets";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { defaultAppHomePath } from "@/lib/journey/nav";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default async function HomePage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (
    can(membership.role, "view_own_journey") &&
    !can(membership.role, "view_teaching_journey")
  ) {
    redirect(defaultAppHomePath(membership.role));
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
          eyebrow="BJJ Pulse"
          title={academy.name}
          description="Faça check-in e acompanhe avisos do tatame"
        />

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--surface-shadow)]">
          <p className="text-sm text-muted-foreground">
            Sem dashboard de gestão neste papel. Vá direto ao check-in ou aos
            avisos.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/checkin"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              Fila de presença
            </Link>
            <Link
              href="/announcements"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium"
            >
              Avisos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let academy;
  let data;
  try {
    [academy, data] = await Promise.all([
      getActiveAcademyBrief(),
      getDashboardData(),
    ]);
  } catch {
    redirect("/select-academy");
  }

  const firstPendingSession =
    data.openSessions.find((s) => s.pendingCount > 0)?.id ??
    data.openSessions[0]?.id ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BJJ Pulse"
        title={academy.name}
        description="Comando do dia no tatame"
      />

      <NowOnMatBoard sessions={data.openSessions} />

      <CheckinQueueCard
        pendingCount={data.pendingApprovals}
        firstSessionId={firstPendingSession}
      />

      <NextClassCard next={data.nextClass} />

      <QuickActions
        canGraduate={can(membership.role, "graduate")}
        canAnnounce={can(membership.role, "manage_announcements")}
        canAddVideo={can(membership.role, "manage_virtual_lessons")}
      />

      <MetricGlassCard metrics={data.metrics} />

      <RecentList
        title="Presenças recentes"
        empty="Ninguém bateu presença ainda hoje. Abra uma aula para começar."
        items={data.recentAttendance.map((item) => ({
          id: item.id,
          primary: item.student_name,
          secondary: item.class_name,
          meta: formatDateTime(item.checked_at),
        }))}
      />

      <RecentList
        title="Graduações recentes"
        empty="Nenhuma faixa nova no mural. A próxima promoção aparece aqui."
        items={data.recentGraduations.map((item) => ({
          id: item.id,
          primary: item.member_name,
          secondary: `${item.belt} · grau ${item.degree}`,
          meta: formatDate(item.graduated_at),
        }))}
      />
    </div>
  );
}
