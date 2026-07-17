import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import { HomeDashboardBodyClient } from "@/components/home/home-dashboard-client";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { defaultAppHomePath } from "@/lib/journey/nav";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="BJJ Pulse"
        title={academy.name}
        description="Comando do dia no tatame"
      />

      <HomeDashboardBodyClient
        initialData={data}
        canGraduate={can(membership.role, "graduate")}
        canAnnounce={can(membership.role, "manage_announcements")}
        canAddVideo={can(membership.role, "manage_virtual_lessons")}
      />
    </div>
  );
}
