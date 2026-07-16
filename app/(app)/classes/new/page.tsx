import Link from "next/link";
import { redirect } from "next/navigation";
import { listUnits } from "@/actions/academies";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { NewClassForm } from "../new-class-form";

export default async function NewClassPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "manage_classes")) {
    redirect("/classes");
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
          href="/classes"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Turmas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Nova turma
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Defina nome, faixa etária e unidade
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <NewClassForm units={units} />
      </div>
    </div>
  );
}
