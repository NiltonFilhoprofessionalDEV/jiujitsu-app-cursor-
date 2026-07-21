"use client";

import Link from "next/link";
import useSWR from "swr";
import type { HomeOpsBoard } from "@/actions/dashboard";
import { fetchHomeOps } from "@/actions/swr-data";
import {
  BirthdaysCard,
  CheckinQueueCard,
  NextClassCard,
  NowOnMatBoard,
} from "@/components/dashboard/home-widgets";
import { swrKeys } from "@/lib/swr/keys";

export function HomeOpsBodyClient({
  initialData,
  canViewMembers,
}: {
  initialData: HomeOpsBoard;
  canViewMembers: boolean;
}) {
  const { data = initialData } = useSWR(swrKeys.homeOps, fetchHomeOps, {
    fallbackData: initialData,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });

  const firstPendingSession =
    data.openSessions.find((s) => s.pendingCount > 0)?.id ??
    data.openSessions[0]?.id ??
    null;

  return (
    <>
      <NowOnMatBoard sessions={data.openSessions} />

      {data.openSessions.length === 0 ? (
        <Link
          href="/classes"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-primary px-4 text-base font-semibold text-primary-foreground shadow-[var(--surface-shadow)] active:scale-[0.99]"
        >
          Abrir aula
        </Link>
      ) : null}

      <CheckinQueueCard
        pendingCount={data.pendingApprovals}
        firstSessionId={firstPendingSession}
      />

      <BirthdaysCard
        birthdays={data.birthdays ?? []}
        canOpenMember={canViewMembers}
      />

      <NextClassCard next={data.nextClass} />

      <Link
        href="/stats"
        className="block rounded-2xl border border-border bg-card px-4 py-4 text-center shadow-[var(--surface-shadow)] active:scale-[0.99]"
      >
        <p className="text-base font-semibold text-foreground">
          Ver números da academia
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Presenças, faixas e ritmo no Stats
        </p>
      </Link>
    </>
  );
}
