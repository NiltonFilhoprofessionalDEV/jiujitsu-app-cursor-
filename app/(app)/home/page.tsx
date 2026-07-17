import Link from "next/link";
import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/dashboard";
import {
  MetricGlassCard,
  QuickActions,
  RecentList,
} from "@/components/dashboard/home-widgets";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", membership.profile_id)
    .eq("is_read", false);

  if (!can(membership.role, "view_dashboard")) {
    return (
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
              Home
            </h1>
            <p className="text-sm text-[var(--bjj-muted)]">
              Bem-vindo ao BJJ Manager
            </p>
          </div>
          <Link
            href="/notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {(unreadCount ?? 0) > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--action-red)] px-1 text-[10px] font-bold text-primary-foreground">
                {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Seu papel não inclui o dashboard de gestão. Use o check-in e o menu
            para avisos e perfil.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/checkin"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              Check-in
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

  let data;
  try {
    data = await getDashboardData();
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Home
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Métricas e atalhos da academia
          </p>
        </div>
        <Link
          href="/notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {(unreadCount ?? 0) > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--action-red)] px-1 text-[10px] font-bold text-primary-foreground">
              {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Link>
      </header>

      <MetricGlassCard metrics={data.metrics} />
      <QuickActions />

      <RecentList
        title="Presenças recentes"
        empty="Nenhuma presença registrada ainda."
        items={data.recentAttendance.map((item) => ({
          id: item.id,
          primary: item.student_name,
          secondary: item.class_name,
          meta: formatDateTime(item.checked_at),
        }))}
      />

      <RecentList
        title="Graduações recentes"
        empty="Nenhuma graduação recente."
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
