import { redirect } from "next/navigation";
import {
  getActiveAcademy,
  listUnits,
  type AcademyDetails,
  type AcademyUnit,
} from "@/actions/academies";
import { getActiveMembership } from "@/lib/permissions/assert";
import { AcademyEditor } from "./academy-editor";
import { UnitsManager } from "./units-manager";

export default async function AcademyPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canManageAcademy = membership.role === "owner";
  const canManageUnits =
    membership.role === "owner" || membership.role === "administrator";

  let academy: AcademyDetails | null = null;
  let units: AcademyUnit[] = [];

  try {
    academy = await getActiveAcademy();
    units = await listUnits();
  } catch {
    redirect("/select-academy");
  }

  if (!academy) {
    redirect("/create-academy");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Academia
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Dados da academia e unidades
        </p>
      </header>

      <AcademyEditor academy={academy} canEdit={canManageAcademy} />
      <UnitsManager units={units} canEdit={canManageUnits} />
    </div>
  );
}
