import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listClasses } from "@/actions/classes";
import { getVirtualLesson } from "@/actions/classroom";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { NewLessonForm } from "../../new/new-lesson-form";

export default async function EditVirtualLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_virtual_lessons")) {
    redirect("/classroom");
  }

  const { id } = await params;
  const [lesson, classes] = await Promise.all([
    getVirtualLesson(id),
    listClasses(),
  ]);

  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/classroom/${lesson.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao vídeo
      </Link>

      <header className="space-y-1">
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
          Editar vídeo
        </BlackBeltTitle>
        <p className="text-sm text-[var(--bjj-muted)]">
          Atualize título, link ou visibilidade
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
        <NewLessonForm
          lesson={lesson}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        />
      </section>
    </div>
  );
}
