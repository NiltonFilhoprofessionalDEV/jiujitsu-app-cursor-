"use client";

import Link from "next/link";
import type { StaffCheckinBoard } from "@/actions/attendance";
import { OpenSessionButton } from "@/app/(app)/classes/open-session-button";
import { cn } from "@/lib/utils";

function formatStartedAt(iso: string | null): string {
  if (!iso) return "Aberta agora";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Aberta agora";
  return `Desde ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function StaffCheckinCockpit({
  board,
  canOpen,
  canApprove,
}: {
  board: StaffCheckinBoard;
  canOpen: boolean;
  canApprove: boolean;
}) {
  const { sessions, pendingTotal, presentTotal, nextClass } = board;

  return (
    <div className="space-y-5">
      {/* Mobile: one urgent summary. Desktop: two metric tiles. */}
      <div className="lg:hidden">
        {pendingTotal > 0 ? (
          <div className="rounded-2xl border border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)] px-4 py-4">
            <p className="text-sm font-medium text-muted-foreground">
              Aguardando aprovação
            </p>
            <p className="mt-1 font-display text-4xl tabular-nums leading-none text-foreground">
              {pendingTotal}
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              {presentTotal} já no tatame
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card px-4 py-4">
            <p className="text-sm font-medium text-muted-foreground">
              No tatame agora
            </p>
            <p className="mt-1 font-display text-4xl tabular-nums leading-none text-foreground">
              {presentTotal}
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              Fila limpa
            </p>
          </div>
        )}
      </div>

      <div className="hidden grid-cols-2 gap-3 lg:grid">
        <div
          className={cn(
            "rounded-2xl border px-4 py-4",
            pendingTotal > 0
              ? "border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)]"
              : "border-border bg-[var(--checkin-metric-muted)]",
          )}
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Na fila
          </p>
          <p className="mt-2 font-display text-4xl tabular-nums leading-none text-foreground">
            {pendingTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--checkin-present-border)] bg-[var(--checkin-present-wash)] px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            No tatame
          </p>
          <p className="mt-2 font-display text-4xl tabular-nums leading-none text-foreground">
            {presentTotal}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <section className="space-y-4 rounded-2xl border border-dashed border-border bg-card p-5 shadow-[var(--surface-shadow)]">
          <div>
            <p className="text-xl font-semibold text-foreground">
              Nenhuma aula aberta
            </p>
            <p className="mt-2 text-base text-muted-foreground">
              {canOpen
                ? "Abra a aula para começar a aprovar presença."
                : "Quando o professor abrir a aula, a fila aparece aqui."}
            </p>
          </div>

          {canOpen && nextClass && !nextClass.openSessionId ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-4">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {nextClass.className}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextClass.isOngoing
                    ? `Em andamento · ${nextClass.startTime}`
                    : `Próxima · ${nextClass.startTime}`}
                </p>
              </div>
              <OpenSessionButton classId={nextClass.classId} />
            </div>
          ) : null}

          {canOpen ? (
            <Link
              href="/classes"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
            >
              Abrir aula
            </Link>
          ) : null}
        </section>
      ) : (
        <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {sessions.map((session) => {
            const href = `/sessions/${session.id}`;
            const urgent = session.pendingCount > 0;
            return (
              <li key={session.id}>
                <article
                  className={cn(
                    "space-y-4 rounded-2xl border p-4 shadow-[var(--surface-shadow)] lg:p-5",
                    urgent
                      ? "border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)]"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {session.className}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatStartedAt(session.startedAt)}
                      </p>
                    </div>
                    {urgent ? (
                      <span className="shrink-0 rounded-full bg-[var(--action-red)] px-3 py-1.5 text-sm font-bold tabular-nums text-primary-foreground">
                        {session.pendingCount}
                      </span>
                    ) : null}
                  </div>

                  {/* Mobile: one line. Desktop: two metric boxes. */}
                  <p className="text-base text-muted-foreground lg:hidden">
                    <span className="font-semibold text-foreground">
                      {session.pendingCount}
                    </span>{" "}
                    pendentes ·{" "}
                    <span className="font-semibold text-foreground">
                      {session.presentCount}
                    </span>{" "}
                    presentes
                  </p>

                  <div className="hidden grid-cols-2 gap-2 text-center lg:grid">
                    <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Pendentes
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                        {session.pendingCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/40 px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Presentes
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                        {session.presentCount}
                      </p>
                    </div>
                  </div>

                  {canApprove || canOpen ? (
                    <Link
                      href={href}
                      className={cn(
                        "inline-flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold transition",
                        urgent
                          ? "bg-[var(--action-red)] text-primary-foreground hover:bg-[var(--action-red)]/90"
                          : "border border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {urgent
                        ? `Aprovar fila (${session.pendingCount})`
                        : "Abrir mesa da aula"}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem permissão para gerenciar esta aula.
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
