"use client";

import useSWR from "swr";
import type { StudentCheckinBoard } from "@/actions/attendance";
import { fetchStudentCheckin } from "@/actions/swr-data";
import { EmptyState } from "@/components/ui/empty-state";
import { swrKeys } from "@/lib/swr/keys";
import { CheckinApprovalCelebration } from "@/app/(app)/checkin/checkin-approval-celebration";
import {
  CheckinStatusBadge,
  RequestCheckinButton,
} from "@/app/(app)/checkin/request-checkin-button";

export function StudentCheckinClient({
  initialBoard,
}: {
  initialBoard: StudentCheckinBoard;
}) {
  const { data: board = initialBoard } = useSWR(
    swrKeys.checkinStudent,
    fetchStudentCheckin,
    { fallbackData: initialBoard },
  );

  return (
    <>
      <CheckinApprovalCelebration items={board.recentApprovals} />

      <div className="space-y-3">
        {board.sessions.length === 0 ? (
          <EmptyState
            title="Nenhuma aula aberta"
            description="Quando o professor abrir a aula da sua turma, ela aparece aqui."
          />
        ) : (
          board.sessions.map((session) => (
            <div
              key={session.id}
              className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {session.class_name ?? "Aula"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.date}
                    {session.started_at
                      ? ` · ${new Date(session.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </p>
                </div>
                <CheckinStatusBadge status={session.myStatus} />
              </div>
              <RequestCheckinButton
                sessionId={session.id}
                status={session.myStatus}
              />
            </div>
          ))
        )}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-base tracking-[0.12em] text-foreground">
          Últimas presenças
        </h2>
        {board.recentHistory.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            Suas próximas presenças aprovadas aparecem aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {board.recentHistory.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-[var(--surface-shadow)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {item.class_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  Aprovado
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
