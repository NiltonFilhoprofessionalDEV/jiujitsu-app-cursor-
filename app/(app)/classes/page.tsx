import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveAcademy } from "@/actions/academies";
import { listClasses } from "@/actions/classes";
import { listOpenSessions } from "@/actions/sessions";
import { PageCreateFab } from "@/components/layout/page-create-fab";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  findNextTraining,
  formatNextTrainingLabel,
} from "@/lib/classes/next-training";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { resolveTimezone } from "@/lib/sessions/auto-open";
import { WEEKDAY_LABELS, formatTime } from "./labels";

export default async function ClassesPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canManage = can(membership.role, "manage_classes");
  const isStudent = membership.role === "student";

  let classes;
  let openByClassId = new Map<string, string>();
  let timeZone = "America/Sao_Paulo";

  try {
    const [listed, academy] = await Promise.all([
      listClasses(),
      getActiveAcademy(),
    ]);
    classes = listed;
    timeZone = resolveTimezone(null, academy?.timezone);

    if (isStudent && listed.length > 0) {
      const openSessions = await listOpenSessions();
      const enrolledIds = new Set(listed.map((c) => c.id));
      for (const session of openSessions) {
        if (enrolledIds.has(session.class_id)) {
          openByClassId.set(session.class_id, session.id);
        }
      }
    }
  } catch {
    redirect("/select-academy");
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description={
          isStudent
            ? "Horários de treino da sua turma"
            : "Grades semanais e aulas no tatame"
        }
      />

      <div className="space-y-3">
        {classes.length === 0 ? (
          <EmptyState
            title={
              isStudent
                ? "Você ainda não está em nenhuma turma"
                : "Nenhuma turma no horário"
            }
            description={
              isStudent
                ? "Peça ao professor ou à academia para te adicionar na turma de adultos."
                : "Monte a primeira turma com dias e horários para abrir aulas e bater presença."
            }
            actionHref={canManage ? "/classes/new" : undefined}
            actionLabel={canManage ? "Nova turma" : undefined}
          />
        ) : (
          classes.map((klass) => {
            const schedules = klass.schedules ?? [];
            const next = isStudent
              ? findNextTraining(schedules, now, timeZone)
              : null;
            const openSessionId = openByClassId.get(klass.id) ?? null;
            const isOpen = Boolean(openSessionId);

            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {klass.name}
                    </p>
                    {!isStudent && klass.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {klass.description}
                      </p>
                    ) : null}
                  </div>
                  {!isStudent ? (
                    <span
                      className={
                        klass.is_active
                          ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                          : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      }
                    >
                      {klass.is_active ? "Ativa" : "Inativa"}
                    </span>
                  ) : null}
                </div>

                {isStudent ? (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {next ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Próximo treino
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {formatNextTrainingLabel(next)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Status
                      </span>
                      {isOpen ? (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          Check-in aberto
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Aula fechada
                        </span>
                      )}
                    </div>

                    {isOpen ? (
                      <Link
                        href="/checkin"
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                      >
                        Ir para check-in
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                {schedules.length > 0 ? (
                  <ul
                    className={
                      isStudent
                        ? "mt-3 space-y-1.5 border-t border-border pt-3"
                        : "mt-3 space-y-1.5 border-t border-border pt-3"
                    }
                  >
                    {isStudent ? (
                      <li className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Grade semanal
                      </li>
                    ) : null}
                    {schedules.map((schedule) => {
                      const highlight =
                        Boolean(next) && next!.scheduleId === schedule.id;
                      return (
                        <li
                          key={schedule.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span
                            className={
                              isStudent && highlight
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground"
                            }
                          >
                            {WEEKDAY_LABELS[schedule.weekday]}
                            {isStudent &&
                            next?.isOngoing &&
                            next.scheduleId === schedule.id
                              ? " · agora"
                              : null}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatTime(schedule.start_time)}–
                            {formatTime(schedule.end_time)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Sem horários cadastrados ainda
                  </p>
                )}
              </>
            );

            if (isStudent) {
              return (
                <div
                  key={klass.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl"
                >
                  {body}
                </div>
              );
            }

            return (
              <Link
                key={klass.id}
                href={`/classes/${klass.id}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl transition hover:bg-muted"
              >
                {body}
              </Link>
            );
          })
        )}
      </div>

      {canManage ? (
        <PageCreateFab href="/classes/new" label="Nova turma" />
      ) : null}
    </div>
  );
}
