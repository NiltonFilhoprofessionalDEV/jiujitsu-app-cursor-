import Link from "next/link";
import { redirect } from "next/navigation";
import { getHomeOpsBoard } from "@/actions/dashboard";
import { HomeDesktopGate } from "@/components/home/home-desktop-gate";
import { HomeOpsBodyClient } from "@/components/home/home-ops-client";
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
    redirect("/login");
  }

  if (
    can(membership.role, "view_own_journey") &&
    !can(membership.role, "view_teaching_journey")
  ) {
    redirect(defaultAppHomePath(membership.role));
  }

  if (!can(membership.role, "view_dashboard")) {
    let academyName = "BJJ Pulse";
    try {
      academyName = (await getActiveAcademyBrief()).name;
    } catch {
      /* keep default */
    }

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="BJJ Pulse"
          title={academyName}
          description="Faça check-in e acompanhe avisos do tatame"
        />

        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--surface-shadow)]">
          <p className="text-base text-muted-foreground">
            Sem painel de gestão neste papel. Vá direto ao check-in ou aos
            avisos.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/checkin"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground"
            >
              Check-in
            </Link>
            <Link
              href="/announcements"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card text-base font-medium"
            >
              Avisos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let academyName = "BJJ Pulse";
  try {
    academyName = (await getActiveAcademyBrief()).name;
  } catch {
    /* keep default title */
  }

  let board;
  try {
    board = await getHomeOpsBoard();
  } catch {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="BJJ Pulse"
          title={academyName}
          description="Comando do tatame"
        />
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--surface-shadow)]">
          <p className="text-lg font-semibold text-foreground">
            Não foi possível carregar o painel
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Verifique a conexão e tente de novo. Se o erro continuar, saia e
            entre novamente.
          </p>
          <div className="mt-5 grid gap-2">
            <Link
              href="/home"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground"
            >
              Tentar de novo
            </Link>
            <Link
              href="/checkin"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card text-base font-medium"
            >
              Ir para check-in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl text-base font-medium text-muted-foreground"
            >
              Entrar de novo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canGraduate = can(membership.role, "graduate");
  const canAnnounce = can(membership.role, "manage_announcements");
  const canAddVideo = can(membership.role, "manage_virtual_lessons");
  const canViewMembers = can(membership.role, "view_members");

  return (
    <div className="space-y-5 lg:space-y-6">
      <PageHeader
        eyebrow="BJJ Pulse"
        title={academyName}
        description="Comando do tatame"
      />

      {/* Mobile: painel slim (ops) */}
      <div className="space-y-5 lg:hidden">
        <HomeOpsBodyClient
          initialData={board}
          canViewMembers={canViewMembers}
        />
      </div>

      {/* Desktop: dashboard completo — só monta em lg+ */}
      <HomeDesktopGate
        canGraduate={canGraduate}
        canAnnounce={canAnnounce}
        canAddVideo={canAddVideo}
        canViewMembers={canViewMembers}
      />
    </div>
  );
}
