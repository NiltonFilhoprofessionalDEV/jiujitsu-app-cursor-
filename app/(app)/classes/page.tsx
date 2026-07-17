import Link from "next/link";
import { redirect } from "next/navigation";
import { listClasses } from "@/actions/classes";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { WEEKDAY_LABELS, formatTime } from "./labels";

export default async function ClassesPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canManage = can(membership.role, "manage_classes");

  let classes;
  try {
    classes = await listClasses();
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turmas"
        description="Grades semanais e aulas no tatame"
        action={
          canManage ? (
            <Link
              href="/classes/new"
              className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Nova
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-2">
        {classes.length === 0 ? (
          <EmptyState
            title="Nenhuma turma no horário"
            description="Monte a primeira turma com dias e horários para abrir aulas e bater presença."
            actionHref={canManage ? "/classes/new" : undefined}
            actionLabel={canManage ? "Criar turma" : undefined}
          />
        ) : (
          classes.map((klass) => {
            const nextSchedule = klass.schedules?.[0];
            return (
              <Link
                key={klass.id}
                href={`/classes/${klass.id}`}
                className="block rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl transition hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {klass.name}
                    </p>
                    {klass.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {klass.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      klass.is_active
                        ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                        : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    }
                  >
                    {klass.is_active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {nextSchedule
                    ? `${WEEKDAY_LABELS[nextSchedule.weekday]} · ${formatTime(nextSchedule.start_time)}–${formatTime(nextSchedule.end_time)}${(klass.schedules?.length ?? 0) > 1 ? ` · +${(klass.schedules?.length ?? 0) - 1}` : ""}`
                    : "Sem horários"}
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
