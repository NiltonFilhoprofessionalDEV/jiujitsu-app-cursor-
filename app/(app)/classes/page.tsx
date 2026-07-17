import Link from "next/link";
import { redirect } from "next/navigation";
import { listClasses } from "@/actions/classes";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
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
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Turmas
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Grades semanais e aulas da academia
          </p>
        </div>
        {canManage ? (
          <Link
            href="/classes/new"
            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nova
          </Link>
        ) : null}
      </header>

      <div className="space-y-2">
        {classes.length === 0 ? (
          <EmptyState
            title="Nenhuma turma cadastrada"
            description="Crie turmas com horários semanais para abrir aulas e registrar presença."
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
                className="block rounded-2xl border border-border bg-card p-4 transition hover:bg-muted backdrop-blur-xl"
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
