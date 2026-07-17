import Link from "next/link";
import { redirect } from "next/navigation";
import { Play } from "lucide-react";

import { listClasses } from "@/actions/classes";
import { listVirtualLessons } from "@/actions/classroom";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { ClassroomFilters } from "./classroom-filters";

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_virtual_lessons")) {
    redirect("/home");
  }

  const canManage = can(membership.role, "manage_virtual_lessons");
  const params = await searchParams;
  const classId = params.classId;

  const [lessons, classes] = await Promise.all([
    listVirtualLessons(classId ? { classId } : undefined),
    listClasses(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Sala virtual
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            Aulas em vídeo da academia
          </p>
        </div>
        {canManage ? (
          <Link
            href="/classroom/new"
            className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Publicar
          </Link>
        ) : null}
      </header>

      <ClassroomFilters
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        activeClassId={classId}
      />

      <section className="space-y-2">
        {lessons.length === 0 ? (
          <EmptyState
            title="Nenhuma aula publicada"
            description="Links do YouTube publicados pela equipe aparecem aqui."
            actionHref={canManage ? "/classroom/new" : undefined}
            actionLabel={canManage ? "Publicar aula" : undefined}
          />
        ) : (
          lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/classroom/${lesson.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl transition hover:bg-muted"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--action-red)]/15">
                <Play className="h-5 w-5 text-[var(--action-red)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {lesson.title}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {lesson.orientation === "vertical"
                    ? "Vertical"
                    : "Horizontal"}
                  {lesson.class_name ? ` · ${lesson.class_name}` : ""}
                  {lesson.visibility === "class" ? " · Só turma" : ""}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
