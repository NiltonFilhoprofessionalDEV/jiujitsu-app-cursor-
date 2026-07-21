"use client";

import useSWR from "swr";
import type { DashboardData } from "@/actions/dashboard";
import { fetchHomeDashboard } from "@/actions/swr-data";
import {
  BirthdaysCard,
  CheckinQueueCard,
  MetricGlassCard,
  NextClassCard,
  NowOnMatBoard,
  QuickActions,
  RecentList,
} from "@/components/dashboard/home-widgets";
import { swrKeys } from "@/lib/swr/keys";

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

function DesktopHomeSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando painel">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}

export function HomeDashboardBodyClient({
  initialData,
  canGraduate,
  canAnnounce,
  canAddVideo,
  canViewMembers,
}: {
  initialData?: DashboardData;
  canGraduate: boolean;
  canAnnounce: boolean;
  canAddVideo: boolean;
  canViewMembers: boolean;
}) {
  const { data = initialData } = useSWR(
    swrKeys.homeDashboard,
    fetchHomeDashboard,
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
      dedupingInterval: 15_000,
    },
  );

  if (!data) {
    return <DesktopHomeSkeleton />;
  }

  const firstPendingSession =
    data.openSessions.find((s) => s.pendingCount > 0)?.id ??
    data.openSessions[0]?.id ??
    null;

  return (
    <>
      <NowOnMatBoard sessions={data.openSessions} />

      <CheckinQueueCard
        pendingCount={data.pendingApprovals}
        firstSessionId={firstPendingSession}
      />

      <BirthdaysCard
        birthdays={data.birthdays ?? []}
        canOpenMember={canViewMembers}
      />

      <NextClassCard next={data.nextClass} />

      <QuickActions
        canGraduate={canGraduate}
        canAnnounce={canAnnounce}
        canAddVideo={canAddVideo}
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
    </>
  );
}
