"use server";

import { revalidatePath } from "next/cache";
import {
  canApproveRequest,
  canRequestCheckin,
} from "@/lib/attendance/rules";
import {
  assertCapability,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceRequestStatus } from "@/types/domain";

export type AttendanceActionState = {
  error?: string;
  success?: string;
} | null;

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

    revalidatePath(`/sessions/${request.session_id}`);
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
      .select("id")
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

    revalidatePath(`/sessions/${sessionId}`);
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
