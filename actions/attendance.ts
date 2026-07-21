"use server";

import { revalidatePath } from "next/cache";
import { unlockAchievementsIfNeeded } from "@/actions/journey";
import { checkAndNotifyGraduationEligibility } from "@/actions/belt-requirements";
import {
  canApproveRequest,
  canRequestCheckin,
} from "@/lib/attendance/rules";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRequestStatus } from "@/types/domain";
import { listOpenSessions, type ClassSessionRow } from "@/actions/sessions";
import {
  findNextTraining,
  formatTimeHm,
  type ScheduleSlot,
} from "@/lib/classes/next-training";
import { resolveTimezone } from "@/lib/sessions/auto-open";

export type AttendanceActionState = {
  error?: string;
  success?: string;
} | null;

export type StudentCheckinStatus =
  | "available"
  | "pending"
  | "approved"
  | "rejected";

export type StudentCheckinSession = ClassSessionRow & {
  myStatus: StudentCheckinStatus;
};

export type RecentAttendanceItem = {
  id: string;
  class_name: string;
  date: string;
  checked_at: string;
};

export type RecentApprovalCelebration = {
  id: string;
  class_name: string;
  date: string;
};

export type StudentCheckinBoard = {
  sessions: StudentCheckinSession[];
  recentHistory: RecentAttendanceItem[];
  recentApprovals: RecentApprovalCelebration[];
};

export type StaffCheckinSession = {
  id: string;
  classId: string;
  className: string;
  date: string;
  startedAt: string | null;
  presentCount: number;
  pendingCount: number;
};

export type StaffCheckinNextClass = {
  classId: string;
  className: string;
  startTime: string;
  openSessionId: string | null;
  isOngoing: boolean;
};

export type StaffCheckinBoard = {
  sessions: StaffCheckinSession[];
  pendingTotal: number;
  presentTotal: number;
  nextClass: StaffCheckinNextClass | null;
};

export type SessionPresentRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_belt: string | null;
  attendance_type: string;
  checked_at: string;
};

export type ManualAttendanceOption = {
  member_id: string;
  name: string;
  belt: string | null;
};

export type PendingAttendanceRequest = {
  id: string;
  session_id: string;
  student_id: string;
  requested_at: string;
  status: AttendanceRequestStatus;
  student_name: string;
  student_belt: string | null;
};

function reasonMessage(
  reason: "session_not_open" | "already_pending" | "already_recorded",
): string {
  if (reason === "session_not_open") {
    return "A aula não está aberta para check-in.";
  }
  if (reason === "already_pending") {
    return "Você já tem um pedido de presença pendente nesta aula.";
  }
  return "Sua presença já foi registrada nesta aula.";
}

async function loadSessionForAcademy(sessionId: string, academyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      status,
      classes!inner(name, academy_id)
    `,
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;

  const classesRel = data.classes as
    | { name: string; academy_id: string }
    | { name: string; academy_id: string }[]
    | null;
  const klass = Array.isArray(classesRel) ? classesRel[0] : classesRel;
  if (!klass || klass.academy_id !== academyId) {
    return null;
  }

  return {
    id: data.id as string,
    class_id: data.class_id as string,
    status: data.status as "scheduled" | "open" | "finished" | "cancelled",
    class_name: klass.name,
  };
}

export async function requestCheckin(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  try {
    const actor = await assertCapability("self_checkin");
    const sessionId = formData.get("sessionId");
    if (typeof sessionId !== "string" || !sessionId) {
      return { error: "Sessão inválida." };
    }

    const session = await loadSessionForAcademy(sessionId, actor.academy_id);
    if (!session) {
      return { error: "Sessão não encontrada." };
    }

    const supabase = await createClient();

    if (actor.role === "student") {
      const { data: roster } = await supabase
        .from("class_members")
        .select("id")
        .eq("class_id", session.class_id)
        .eq("member_id", actor.id)
        .maybeSingle();
      if (!roster) {
        return { error: "Você não está matriculado nesta turma." };
      }
    }

    const [{ data: pending }, { data: record }] = await Promise.all([
      supabase
        .from("attendance_requests")
        .select("id")
        .eq("session_id", sessionId)
        .eq("student_id", actor.id)
        .eq("status", "pending")
        .maybeSingle(),
      supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", sessionId)
        .eq("student_id", actor.id)
        .maybeSingle(),
    ]);

    const gate = canRequestCheckin({
      sessionStatus: session.status,
      hasPending: Boolean(pending),
      hasRecord: Boolean(record),
    });

    if (!gate.ok) {
      return { error: reasonMessage(gate.reason) };
    }

    const { error } = await supabase.from("attendance_requests").insert({
      session_id: sessionId,
      student_id: actor.id,
      status: "pending",
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/checkin");
    revalidatePath(`/sessions/${sessionId}`);
    return { success: "Presença solicitada. Aguarde a aprovação." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para registrar presença." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível solicitar a presença.",
    };
  }
}

export async function listPendingRequests(
  sessionId: string,
): Promise<PendingAttendanceRequest[]> {
  const member = await assertCapability("approve_attendance");
  const session = await loadSessionForAcademy(sessionId, member.academy_id);
  if (!session) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_requests")
    .select(
      `
      id,
      session_id,
      student_id,
      requested_at,
      status,
      academy_members!student_id(
        current_belt,
        profiles(name)
      )
    `,
    )
    .eq("session_id", sessionId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const memberRel = row.academy_members as
      | {
          current_belt: string | null;
          profiles:
            | { name: string }
            | { name: string }[]
            | null;
        }
      | {
          current_belt: string | null;
          profiles:
            | { name: string }
            | { name: string }[]
            | null;
        }[]
      | null;

    const am = Array.isArray(memberRel) ? memberRel[0] : memberRel;
    const profile = am?.profiles
      ? Array.isArray(am.profiles)
        ? am.profiles[0]
        : am.profiles
      : null;

    return [
      {
        id: row.id as string,
        session_id: row.session_id as string,
        student_id: row.student_id as string,
        requested_at: row.requested_at as string,
        status: row.status as AttendanceRequestStatus,
        student_name: profile?.name ?? "Aluno",
        student_belt: am?.current_belt ?? null,
      },
    ];
  });
}

export async function approveCheckin(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  try {
    const actor = await assertCapability("approve_attendance");
    const requestId = formData.get("requestId");
    if (typeof requestId !== "string" || !requestId) {
      return { error: "Pedido inválido." };
    }

    const supabase = await createClient();
    const { data: request, error: fetchError } = await supabase
      .from("attendance_requests")
      .select(
        `
        id,
        session_id,
        student_id,
        status,
        class_sessions!inner(
          id,
          status,
          classes!inner(academy_id, name)
        ),
        academy_members!student_id(
          profile_id,
          profiles(name)
        )
      `,
      )
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!request) {
      return { error: "Pedido não encontrado." };
    }

    const sessionRel = request.class_sessions as
      | {
          id: string;
          status: string;
          classes:
            | { academy_id: string; name: string }
            | { academy_id: string; name: string }[]
            | null;
        }
      | {
          id: string;
          status: string;
          classes:
            | { academy_id: string; name: string }
            | { academy_id: string; name: string }[]
            | null;
        }[]
      | null;

    const session = Array.isArray(sessionRel) ? sessionRel[0] : sessionRel;
    const classesRel = session?.classes ?? null;
    const klass = Array.isArray(classesRel) ? classesRel[0] : classesRel;

    if (!session || !klass || klass.academy_id !== actor.academy_id) {
      return { error: "Pedido não pertence à academia ativa." };
    }

    if (!canApproveRequest(request.status as AttendanceRequestStatus)) {
      return { error: "Apenas pedidos pendentes podem ser aprovados." };
    }

    const { error: rpcError } = await supabase.rpc(
      "approve_attendance_request",
      { p_request_id: requestId },
    );

    if (rpcError) {
      return { error: rpcError.message };
    }

    const memberRel = request.academy_members as
      | {
          profile_id: string;
          profiles: { name: string } | { name: string }[] | null;
        }
      | {
          profile_id: string;
          profiles: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const am = Array.isArray(memberRel) ? memberRel[0] : memberRel;

    if (am?.profile_id) {
      await supabase.rpc("notify_profile", {
        p_profile_id: am.profile_id,
        p_title: "Presença aprovada",
        p_description: `Sua presença na aula ${klass.name} foi confirmada.`,
      });

      await unlockAchievementsIfNeeded({
        academyId: actor.academy_id,
        memberId: request.student_id as string,
        profileId: am.profile_id,
      });
      await checkAndNotifyGraduationEligibility(request.student_id as string);
      revalidatePath("/journey");
      revalidatePath("/notifications");
      revalidatePath("/graduations");
    }

    revalidatePath(`/sessions/${request.session_id}`);
    revalidatePath("/checkin");
    return { success: "Presença aprovada." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para aprovar presença." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível aprovar a presença.",
    };
  }
}

export async function rejectCheckin(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  try {
    const actor = await assertCapability("approve_attendance");
    const requestId = formData.get("requestId");
    if (typeof requestId !== "string" || !requestId) {
      return { error: "Pedido inválido." };
    }

    const supabase = await createClient();
    const { data: request, error: fetchError } = await supabase
      .from("attendance_requests")
      .select(
        `
        id,
        session_id,
        status,
        class_sessions!inner(
          classes!inner(academy_id)
        )
      `,
      )
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!request) {
      return { error: "Pedido não encontrado." };
    }

    const sessionRel = request.class_sessions as
      | {
          classes:
            | { academy_id: string }
            | { academy_id: string }[]
            | null;
        }
      | {
          classes:
            | { academy_id: string }
            | { academy_id: string }[]
            | null;
        }[]
      | null;
    const session = Array.isArray(sessionRel) ? sessionRel[0] : sessionRel;
    const classesRel = session?.classes ?? null;
    const klass = Array.isArray(classesRel) ? classesRel[0] : classesRel;

    if (!klass || klass.academy_id !== actor.academy_id) {
      return { error: "Pedido não pertence à academia ativa." };
    }

    if (!canApproveRequest(request.status as AttendanceRequestStatus)) {
      return { error: "Apenas pedidos pendentes podem ser rejeitados." };
    }

    const { error } = await supabase
      .from("attendance_requests")
      .update({ status: "rejected" })
      .eq("id", requestId)
      .eq("status", "pending");

    if (error) {
      return { error: error.message };
    }

    const { data: fullRequest } = await supabase
      .from("attendance_requests")
      .select(
        `
        student_id,
        class_sessions!inner(
          classes!inner(name, academy_id)
        ),
        academy_members!student_id(profile_id)
      `,
      )
      .eq("id", requestId)
      .maybeSingle();

    const studentRel = fullRequest?.academy_members as
      | { profile_id: string }
      | { profile_id: string }[]
      | null;
    const student = Array.isArray(studentRel) ? studentRel[0] : studentRel;
    const notifySessionRel = fullRequest?.class_sessions as
      | {
          classes:
            | { name: string; academy_id: string }
            | { name: string; academy_id: string }[]
            | null;
        }
      | {
          classes:
            | { name: string; academy_id: string }
            | { name: string; academy_id: string }[]
            | null;
        }[]
      | null;
    const sessionRow = Array.isArray(notifySessionRel)
      ? notifySessionRel[0]
      : notifySessionRel;
    const classRel = sessionRow?.classes ?? null;
    const klassNotify = Array.isArray(classRel) ? classRel[0] : classRel;

    if (student?.profile_id) {
      await supabase.rpc("notify_profile", {
        p_profile_id: student.profile_id,
        p_title: "Presença não aprovada",
        p_description: klassNotify?.name
          ? `Seu pedido na aula ${klassNotify.name} foi rejeitado. Você pode tentar novamente.`
          : "Seu pedido de presença foi rejeitado. Você pode tentar novamente.",
      });
      revalidatePath("/notifications");
    }

    revalidatePath(`/sessions/${request.session_id}`);
    revalidatePath("/checkin");
    return { success: "Pedido rejeitado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para rejeitar presença." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível rejeitar o pedido.",
    };
  }
}

export async function manualAttendance(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  try {
    const actor = await assertCapability("manual_attendance");
    const sessionId = formData.get("sessionId");
    const studentMemberId = formData.get("studentMemberId");

    if (typeof sessionId !== "string" || !sessionId) {
      return { error: "Sessão inválida." };
    }
    if (typeof studentMemberId !== "string" || !studentMemberId) {
      return { error: "Aluno inválido." };
    }

    const session = await loadSessionForAcademy(sessionId, actor.academy_id);
    if (!session) {
      return { error: "Sessão não encontrada." };
    }
    if (session.status !== "open") {
      return { error: "Aula precisa estar aberta para presença manual." };
    }

    const supabase = await createClient();
    const { data: student, error: studentError } = await supabase
      .from("academy_members")
      .select("id, profile_id")
      .eq("id", studentMemberId)
      .eq("academy_id", actor.academy_id)
      .eq("status", "active")
      .maybeSingle();

    if (studentError) {
      return { error: studentError.message };
    }
    if (!student) {
      return { error: "Aluno não encontrado na academia." };
    }

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("session_id", sessionId)
      .eq("student_id", studentMemberId)
      .maybeSingle();

    if (existing) {
      return { error: "Este aluno já tem presença nesta aula." };
    }

    const { error } = await supabase.from("attendance_records").insert({
      session_id: sessionId,
      student_id: studentMemberId,
      attendance_type: "manual",
    });

    if (error) {
      return { error: error.message };
    }

    await unlockAchievementsIfNeeded({
      academyId: actor.academy_id,
      memberId: studentMemberId,
      profileId: student.profile_id as string,
    });
    await checkAndNotifyGraduationEligibility(studentMemberId);
    revalidatePath("/journey");
    revalidatePath("/notifications");
    revalidatePath("/graduations");

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath("/checkin");
    return { success: "Presença manual registrada." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para presença manual." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível registrar a presença.",
    };
  }
}

const RECENT_APPROVAL_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function getStudentCheckinBoard(): Promise<StudentCheckinBoard> {
  const member = await getActiveMembership();
  const supabase = await createClient();
  const openSessions = await listOpenSessions();
  const sessionIds = openSessions.map((s) => s.id);

  const statusBySession = new Map<string, StudentCheckinStatus>();

  if (sessionIds.length > 0) {
    const [{ data: records }, { data: requests }] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("session_id")
        .eq("student_id", member.id)
        .in("session_id", sessionIds),
      supabase
        .from("attendance_requests")
        .select("session_id, status, requested_at")
        .eq("student_id", member.id)
        .in("session_id", sessionIds)
        .order("requested_at", { ascending: false }),
    ]);

    for (const row of records ?? []) {
      statusBySession.set(row.session_id as string, "approved");
    }

    for (const row of requests ?? []) {
      const sid = row.session_id as string;
      if (statusBySession.has(sid)) continue;
      const status = row.status as AttendanceRequestStatus;
      if (status === "pending") statusBySession.set(sid, "pending");
      else if (status === "rejected") statusBySession.set(sid, "rejected");
      else if (status === "approved") statusBySession.set(sid, "approved");
    }
  }

  const sessions: StudentCheckinSession[] = openSessions.map((session) => ({
    ...session,
    myStatus: statusBySession.get(session.id) ?? "available",
  }));

  const approvalCutoff = new Date(
    Date.now() - RECENT_APPROVAL_WINDOW_MS,
  ).toISOString();

  const [{ data: historyRows, error: historyError }, { data: recentApprovalRows }] =
    await Promise.all([
      supabase
        .from("attendance_records")
        .select(
          `
      id,
      checked_at,
      class_sessions!inner(
        date,
        classes!inner(name, academy_id)
      )
    `,
        )
        .eq("student_id", member.id)
        .order("checked_at", { ascending: false })
        .limit(5),
      supabase
        .from("attendance_records")
        .select(
          `
      id,
      checked_at,
      class_sessions!inner(
        date,
        classes!inner(name, academy_id)
      )
    `,
        )
        .eq("student_id", member.id)
        .gte("checked_at", approvalCutoff)
        .order("checked_at", { ascending: false })
        .limit(5),
    ]);

  if (historyError) throw historyError;

  const recentHistory: RecentAttendanceItem[] = (historyRows ?? []).flatMap(
    (row) => {
      const sessionRel = row.class_sessions as
        | {
            date: string;
            classes:
              | { name: string; academy_id: string }
              | { name: string; academy_id: string }[]
              | null;
          }
        | {
            date: string;
            classes:
              | { name: string; academy_id: string }
              | { name: string; academy_id: string }[]
              | null;
          }[]
        | null;
      const session = Array.isArray(sessionRel) ? sessionRel[0] : sessionRel;
      const classesRel = session?.classes ?? null;
      const klass = Array.isArray(classesRel) ? classesRel[0] : classesRel;
      if (!klass || klass.academy_id !== member.academy_id) return [];
      return [
        {
          id: row.id as string,
          class_name: klass.name,
          date: session?.date ?? "",
          checked_at: row.checked_at as string,
        },
      ];
    },
  );

  const recentApprovals: RecentApprovalCelebration[] = (
    recentApprovalRows ?? []
  ).flatMap((row) => {
    const sessionRel = row.class_sessions as
      | {
          date: string;
          classes:
            | { name: string; academy_id: string }
            | { name: string; academy_id: string }[]
            | null;
        }
      | {
          date: string;
          classes:
            | { name: string; academy_id: string }
            | { name: string; academy_id: string }[]
            | null;
        }[]
      | null;
    const session = Array.isArray(sessionRel) ? sessionRel[0] : sessionRel;
    const classesRel = session?.classes ?? null;
    const klass = Array.isArray(classesRel) ? classesRel[0] : classesRel;
    if (!klass || klass.academy_id !== member.academy_id) return [];
    return [
      {
        id: row.id as string,
        class_name: klass.name,
        date: session?.date ?? "",
      },
    ];
  });

  return { sessions, recentHistory, recentApprovals };
}

function assertCanRunCheckinDesk() {
  return getActiveMembership().then((member) => {
    if (
      !can(member.role, "approve_attendance") &&
      !can(member.role, "manual_attendance") &&
      !can(member.role, "open_session") &&
      !can(member.role, "close_session")
    ) {
      throw new PermissionError(member.role, "approve_attendance");
    }
    return member;
  });
}

export async function getStaffCheckinBoard(): Promise<StaffCheckinBoard> {
  const member = await assertCanRunCheckinDesk();
  const supabase = await createClient();
  const academyId = member.academy_id;

  const { data: openRows, error: openError } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      date,
      started_at,
      classes!inner(id, name, academy_id)
    `,
    )
    .eq("status", "open")
    .eq("classes.academy_id", academyId)
    .order("started_at", { ascending: false });

  if (openError) throw openError;

  const openList = (openRows ?? []).flatMap((row) => {
    const klass = row.classes as
      | { id: string; name: string; academy_id: string }
      | { id: string; name: string; academy_id: string }[]
      | null;
    const one = Array.isArray(klass) ? klass[0] : klass;
    if (!one || one.academy_id !== academyId) return [];
    return [
      {
        id: row.id as string,
        classId: row.class_id as string,
        className: one.name ?? "Turma",
        date: row.date as string,
        startedAt: (row.started_at as string | null) ?? null,
      },
    ];
  });

  let sessions: StaffCheckinSession[] = openList.map((s) => ({
    ...s,
    presentCount: 0,
    pendingCount: 0,
  }));

  if (openList.length > 0) {
    const openIds = openList.map((s) => s.id);
    const [{ data: presentRows }, { data: pendingRows }] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("session_id")
        .in("session_id", openIds),
      supabase
        .from("attendance_requests")
        .select("session_id")
        .eq("status", "pending")
        .in("session_id", openIds),
    ]);

    const presentMap = new Map<string, number>();
    for (const row of presentRows ?? []) {
      const sid = row.session_id as string;
      presentMap.set(sid, (presentMap.get(sid) ?? 0) + 1);
    }
    const pendingMap = new Map<string, number>();
    for (const row of pendingRows ?? []) {
      const sid = row.session_id as string;
      pendingMap.set(sid, (pendingMap.get(sid) ?? 0) + 1);
    }

    sessions = openList.map((s) => ({
      ...s,
      presentCount: presentMap.get(s.id) ?? 0,
      pendingCount: pendingMap.get(s.id) ?? 0,
    }));
  }

  const pendingTotal = sessions.reduce((sum, s) => sum + s.pendingCount, 0);
  const presentTotal = sessions.reduce((sum, s) => sum + s.presentCount, 0);

  let nextClass: StaffCheckinNextClass | null = null;
  try {
    const [{ data: academyRow }, { data: classRows }] = await Promise.all([
      supabase
        .from("academies")
        .select("timezone")
        .eq("id", academyId)
        .maybeSingle(),
      supabase
        .from("classes")
        .select(
          `
          id,
          name,
          is_active,
          class_schedules(id, weekday, start_time, end_time)
        `,
        )
        .eq("academy_id", academyId)
        .eq("is_active", true),
    ]);

    const timeZone = resolveTimezone(
      null,
      (academyRow?.timezone as string | null) ?? null,
    );
    const now = new Date();
    const openByClassId = new Map(
      sessions.map((s) => [s.classId, s.id] as const),
    );

    type Scored = {
      classId: string;
      className: string;
      startTime: string;
      isOngoing: boolean;
      dayOffset: number;
    };

    const scored: Scored[] = [];
    for (const row of classRows ?? []) {
      const schedules = (row.class_schedules as ScheduleSlot[] | null) ?? [];
      for (const schedule of schedules) {
        if (
          schedule?.id == null ||
          schedule.start_time == null ||
          schedule.end_time == null
        ) {
          continue;
        }
        const next = findNextTraining(
          [
            {
              id: String(schedule.id),
              weekday: Number(schedule.weekday),
              start_time: String(schedule.start_time),
              end_time: String(schedule.end_time),
            },
          ],
          now,
          timeZone,
        );
        if (!next) continue;
        scored.push({
          classId: row.id as string,
          className: row.name as string,
          startTime: next.startTime,
          isOngoing: next.isOngoing,
          dayOffset: next.dayOffset,
        });
      }
    }

    scored.sort((a, b) => {
      if (a.isOngoing !== b.isOngoing) return a.isOngoing ? -1 : 1;
      if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
      return a.startTime.localeCompare(b.startTime);
    });

    const top = scored[0] ?? null;
    nextClass = top
      ? {
          classId: top.classId,
          className: top.className,
          startTime: formatTimeHm(top.startTime),
          openSessionId: openByClassId.get(top.classId) ?? null,
          isOngoing: top.isOngoing,
        }
      : null;
  } catch {
    nextClass = null;
  }

  return { sessions, pendingTotal, presentTotal, nextClass };
}

export async function listSessionPresent(
  sessionId: string,
): Promise<SessionPresentRow[]> {
  const member = await assertCanRunCheckinDesk();
  const session = await loadSessionForAcademy(sessionId, member.academy_id);
  if (!session) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      `
      id,
      student_id,
      attendance_type,
      checked_at,
      academy_members!student_id(
        current_belt,
        profiles(name)
      )
    `,
    )
    .eq("session_id", sessionId)
    .order("checked_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const memberRel = row.academy_members as
      | {
          current_belt: string | null;
          profiles: { name: string } | { name: string }[] | null;
        }
      | {
          current_belt: string | null;
          profiles: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const am = Array.isArray(memberRel) ? memberRel[0] : memberRel;
    const profile = am?.profiles
      ? Array.isArray(am.profiles)
        ? am.profiles[0]
        : am.profiles
      : null;

    return [
      {
        id: row.id as string,
        student_id: row.student_id as string,
        student_name: profile?.name ?? "Aluno",
        student_belt: am?.current_belt ?? null,
        attendance_type: row.attendance_type as string,
        checked_at: row.checked_at as string,
      },
    ];
  });
}

export async function listManualAttendanceOptions(
  sessionId: string,
): Promise<ManualAttendanceOption[]> {
  const member = await assertCapability("manual_attendance");
  const session = await loadSessionForAcademy(sessionId, member.academy_id);
  if (!session) return [];

  const supabase = await createClient();
  const [{ data: roster }, { data: present }] = await Promise.all([
    supabase
      .from("class_members")
      .select(
        `
        member_id,
        academy_members!member_id(
          current_belt,
          status,
          profiles(name)
        )
      `,
      )
      .eq("class_id", session.class_id),
    supabase
      .from("attendance_records")
      .select("student_id")
      .eq("session_id", sessionId),
  ]);

  const presentIds = new Set(
    (present ?? []).map((row) => row.student_id as string),
  );

  return (roster ?? []).flatMap((row) => {
    const memberId = row.member_id as string;
    if (presentIds.has(memberId)) return [];

    const amRel = row.academy_members as
      | {
          current_belt: string | null;
          status: string;
          profiles: { name: string } | { name: string }[] | null;
        }
      | {
          current_belt: string | null;
          status: string;
          profiles: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const am = Array.isArray(amRel) ? amRel[0] : amRel;
    if (!am || am.status !== "active") return [];
    const profile = am.profiles
      ? Array.isArray(am.profiles)
        ? am.profiles[0]
        : am.profiles
      : null;

    return [
      {
        member_id: memberId,
        name: profile?.name ?? "Aluno",
        belt: am.current_belt,
      },
    ];
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
