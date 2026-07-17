import Link from "next/link";
import type { StaffCheckinBoard } from "@/actions/attendance";
import { OpenSessionButton } from "@/app/(app)/classes/open-session-button";
import { cn } from "@/lib/utils";

function formatStartedAt(iso: string | null): string {
  if (!iso) return "Aberta";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Aberta";
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
      <div className="grid grid-cols-2 gap-2">
        <div
          className={cn(
            "rounded-2xl border px-4 py-3",
            pendingTotal > 0
              ? "border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)]"
              : "border-border bg-[var(--checkin-metric-muted)]",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Na fila
          </p>
          <p className="mt-1 font-display text-3xl tabular-nums leading-none text-foreground">
            {pendingTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--checkin-present-border)] bg-[var(--checkin-present-wash)] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            No tatame
          </p>
          <p className="mt-1 font-display text-3xl tabular-nums leading-none text-foreground">
            {presentTotal}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <section className="space-y-4 rounded-2xl border border-dashed border-border bg-card p-4 shadow-[var(--surface-shadow)]">
          <div>
            <p className="font-display text-lg tracking-[0.08em] text-foreground">
              Nenhuma aula aberta
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canOpen
                ? "Abra a aula para começar a aprovar presença."
                : "Quando o professor abrir a aula, a fila aparece aqui."}
            </p>
          </div>

          {canOpen && nextClass && !nextClass.openSessionId ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {nextClass.className}
                </p>
                <p className="text-xs text-muted-foreground">
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
              className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              Ver todas as turmas
            </Link>
          ) : null}
        </section>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => {
            const href = `/sessions/${session.id}`;
            const urgent = session.pendingCount > 0;
            return (
              <li key={session.id}>
                <article
                  className={cn(
                    "space-y-3 rounded-2xl border p-4 shadow-[var(--surface-shadow)]",
                    urgent
                      ? "border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)]"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {session.className}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatStartedAt(session.startedAt)}
                      </p>
                    </div>
                    {urgent ? (
                      <span className="shrink-0 rounded-full bg-[var(--action-red)] px-2.5 py-1 text-xs font-bold tabular-nums text-primary-foreground">
                        {session.pendingCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl border border-border bg-background/40 px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Pendentes
                      </p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                        {session.pendingCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/40 px-2 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Presentes
                      </p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                        {session.presentCount}
                      </p>
                    </div>
                  </div>

                  {canApprove || canOpen ? (
                    <a
                      href={href}
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition",
                        urgent
                          ? "bg-[var(--action-red)] text-primary-foreground hover:bg-[var(--action-red)]/90"
                          : "border border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {urgent
                        ? `Aprovar fila (${session.pendingCount})`
                        : "Abrir mesa da aula"}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
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
