import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listUnits } from "@/actions/academies";
import { getClass } from "@/actions/classes";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EditClassForm } from "../../edit-class-form";

type Params = Promise<{ id: string }>;

export default async function EditClassPage({ params }: { params: Params }) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_classes")) {
    redirect("/classes");
  }

  const { id } = await params;

  let klass;
  try {
    klass = await getClass(id);
  } catch {
    redirect("/select-academy");
  }

  if (!klass) {
    notFound();
  }

  let units: { id: string; name: string }[] = [];
  try {
    const allUnits = await listUnits();
    units = allUnits
      .filter((unit) => unit.is_active)
      .map((unit) => ({ id: unit.id, name: unit.name }));
  } catch {
    units = [];
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/classes/${klass.id}`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← {klass.name}
        </Link>
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
          Editar turma
        </BlackBeltTitle>
        <p className="text-sm text-[var(--bjj-muted)]">
          Nome, requisitos e status da turma
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-xl">
        <EditClassForm klass={klass} units={units} />
      </div>
    </div>
  );
}
