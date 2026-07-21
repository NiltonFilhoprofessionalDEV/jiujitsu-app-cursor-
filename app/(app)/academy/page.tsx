import { redirect } from "next/navigation";
import {
  getActiveAcademy,
  listUnits,
  type AcademyDetails,
  type AcademyUnit,
} from "@/actions/academies";
import { listBeltRequirementsForForm } from "@/actions/belt-requirements";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { AcademyEditor } from "./academy-editor";
import { BeltRequirementsForm } from "./belt-requirements-form";
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
  const canEditBelts = can(membership.role, "graduate");
  const canViewBelts =
    canEditBelts ||
    membership.role === "owner" ||
    membership.role === "administrator";

  let academy: AcademyDetails | null = null;
  let units: AcademyUnit[] = [];
  let beltRequirements: Awaited<
    ReturnType<typeof listBeltRequirementsForForm>
  > = [];

  try {
    academy = await getActiveAcademy();
    units = await listUnits();
    if (canViewBelts) {
      beltRequirements = await listBeltRequirementsForForm();
    }
  } catch {
    redirect("/select-academy");
  }

  if (!academy) {
    redirect("/waiting-academy");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Academia"
        description="Dados da academia, unidades e metas de graduação"
      />

      <AcademyEditor academy={academy} canEdit={canManageAcademy} />
      <UnitsManager units={units} canEdit={canManageUnits} />

      {canViewBelts ? (
        <BeltRequirementsForm
          initial={beltRequirements}
          canEdit={canEditBelts}
        />
      ) : null}
    </div>
  );
}
