import { redirect } from "next/navigation";
import { fetchClassesBoard } from "@/actions/swr-data";
import { ClassesBoardClient } from "@/components/classes/classes-board-client";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

export default async function ClassesPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canManage = can(membership.role, "manage_classes");
  const isStudent = membership.role === "student";

  let board;
  try {
    board = await fetchClassesBoard();
  } catch {
    redirect("/select-academy");
  }

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

      <ClassesBoardClient
        initialData={board}
        canManage={canManage}
        isStudent={isStudent}
      />
    </div>
  );
}
