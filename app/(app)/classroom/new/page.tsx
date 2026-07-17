import { redirect } from "next/navigation";
import { listClasses } from "@/actions/classes";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { NewLessonForm } from "./new-lesson-form";

export default async function NewVirtualLessonPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_virtual_lessons")) {
    redirect("/classroom");
  }

  const classes = await listClasses();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
          Publicar aula
        </BlackBeltTitle>
        <p className="text-sm text-[var(--bjj-muted)]">
          Cole um link do YouTube para embed in-app
        </p>
      </header>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
        <NewLessonForm
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        />
      </section>
    </div>
  );
}
