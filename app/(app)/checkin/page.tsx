import { redirect } from "next/navigation";
import {
  fetchStaffCheckin,
  fetchStudentCheckin,
} from "@/actions/swr-data";
import { StaffCheckinClient } from "@/components/checkin/staff-checkin-client";
import { StudentCheckinClient } from "@/components/checkin/student-checkin-client";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

export default async function CheckinPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canSelfCheckin = can(membership.role, "self_checkin");
  const canOpen = can(membership.role, "open_session");
  const canApprove = can(membership.role, "approve_attendance");

  if (canSelfCheckin) {
    let board;
    try {
      board = await fetchStudentCheckin();
    } catch {
      redirect("/select-academy");
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title="Check-in"
          description="Suas turmas com aula aberta agora"
        />
        <StudentCheckinClient initialBoard={board} />
      </div>
    );
  }

  let board;
  try {
    board = await fetchStaffCheckin();
  } catch {
    board = {
      sessions: [],
      pendingTotal: 0,
      presentTotal: 0,
      nextClass: null,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fila de presença"
        description="Aulas abertas · aprovar e acompanhar o tatame"
      />
      <StaffCheckinClient
        initialBoard={board}
        canOpen={canOpen}
        canApprove={canApprove}
      />
    </div>
  );
}
