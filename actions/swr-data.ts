"use server";

import { getActiveAcademy } from "@/actions/academies";
import {
  getStaffCheckinBoard,
  getStudentCheckinBoard,
  type StaffCheckinBoard,
  type StudentCheckinBoard,
} from "@/actions/attendance";
import { listClasses, type ClassRow } from "@/actions/classes";
import {
  getHomeOpsBoard,
  type HomeOpsBoard,
} from "@/actions/dashboard";
import { listMembers, type AcademyMemberRow } from "@/actions/members";
import { listOpenSessions } from "@/actions/sessions";
import { getActiveMembership } from "@/lib/permissions/assert";
import { resolveTimezone } from "@/lib/sessions/auto-open";

export type ClassesBoardData = {
  classes: ClassRow[];
  timeZone: string;
  openByClassId: Record<string, string>;
};

export async function fetchHomeOps(): Promise<HomeOpsBoard> {
  return getHomeOpsBoard();
}

export async function fetchClassesBoard(): Promise<ClassesBoardData> {
  const membership = await getActiveMembership();
  const isStudent = membership.role === "student";

  const [listed, academy] = await Promise.all([
    listClasses(),
    getActiveAcademy(),
  ]);

  const openByClassId: Record<string, string> = {};
  if (isStudent && listed.length > 0) {
    const openSessions = await listOpenSessions();
    const enrolledIds = new Set(listed.map((c) => c.id));
    for (const session of openSessions) {
      if (enrolledIds.has(session.class_id)) {
        openByClassId[session.class_id] = session.id;
      }
    }
  }

  return {
    classes: listed,
    timeZone: resolveTimezone(null, academy?.timezone),
    openByClassId,
  };
}

export async function fetchStudentCheckin(): Promise<StudentCheckinBoard> {
  return getStudentCheckinBoard();
}

export async function fetchStaffCheckin(): Promise<StaffCheckinBoard> {
  return getStaffCheckinBoard();
}

export async function fetchMembersList(filters: {
  role?: string;
  status?: string;
  belt?: string;
  q?: string;
}): Promise<AcademyMemberRow[]> {
  return listMembers({
    role: filters.role,
    status: filters.status,
    belt: filters.belt,
    q: filters.q,
  });
}
