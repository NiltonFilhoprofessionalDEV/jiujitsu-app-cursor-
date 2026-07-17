"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export type SessionActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
} | null;

export type ClassSessionRow = {
  id: string;
  class_id: string;
  instructor_id: string;
  date: string;
  started_at: string | null;
  finished_at: string | null;
  status: "scheduled" | "open" | "finished" | "cancelled";
  class_name?: string;
};

function todayDateString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function academyFromClassesRel(
  classesRel:
    | { name?: string; academy_id: string }
    | { name?: string; academy_id: string }[]
    | null,
): { name?: string; academy_id: string } | null {
  if (!classesRel) return null;
  return Array.isArray(classesRel) ? (classesRel[0] ?? null) : classesRel;
}

export async function openSession(
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  try {
    const actor = await assertCapability("open_session");
    const classId = formData.get("classId");
    if (typeof classId !== "string" || !classId) {
      return { error: "Turma inválida." };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id, name, is_active")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) {
      return { error: classError.message };
    }
    if (!klass) {
      return { error: "Turma não encontrada." };
    }
    if (!klass.is_active) {
      return { error: "Não é possível abrir aula de turma inativa." };
    }

    const { data: existingOpen } = await supabase
      .from("class_sessions")
      .select("id")
      .eq("class_id", classId)
      .eq("status", "open")
      .maybeSingle();

    if (existingOpen) {
      revalidatePath(`/classes/${classId}`);
      revalidatePath("/checkin");
      return {
        success: "Aula já estava aberta.",
        redirectTo: `/sessions/${existingOpen.id}`,
      };
    }

    const now = new Date().toISOString();
    const { data: session, error } = await supabase
      .from("class_sessions")
      .insert({
        class_id: classId,
        instructor_id: actor.id,
        date: todayDateString(),
        started_at: now,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    revalidatePath("/checkin");
    return {
      success: "Aula aberta.",
      redirectTo: `/sessions/${session.id}`,
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para abrir aula." };
    }
    return {
      error:
        err instanceof Error ? err.message : "Não foi possível abrir a aula.",
    };
  }
}

export async function closeSession(
  _prevState: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  try {
    const actor = await assertCapability("close_session");
    const sessionId = formData.get("sessionId");
    if (typeof sessionId !== "string" || !sessionId) {
      return { error: "Sessão inválida." };
    }

    const supabase = await createClient();
    const { data: session, error: fetchError } = await supabase
      .from("class_sessions")
      .select(
        `
        id,
        class_id,
        status,
        instructor_id,
        classes!inner(academy_id)
      `,
      )
      .eq("id", sessionId)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!session) {
      return { error: "Sessão não encontrada." };
    }

    const klass = academyFromClassesRel(
      session.classes as
        | { academy_id: string }
        | { academy_id: string }[]
        | null,
    );
    if (!klass || klass.academy_id !== actor.academy_id) {
      return { error: "Sessão não pertence à academia ativa." };
    }

    if (session.status !== "open") {
      return { error: "Apenas aulas abertas podem ser encerradas." };
    }

    const { error } = await supabase
      .from("class_sessions")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      return { error: error.message };
    }

    const instructorId = session.instructor_id as string;
    const { data: instructor } = await supabase
      .from("academy_members")
      .select("id, profile_id")
      .eq("id", instructorId)
      .maybeSingle();

    if (instructor?.profile_id) {
      const { unlockAchievementsIfNeeded } = await import("@/actions/journey");
      await unlockAchievementsIfNeeded({
        academyId: actor.academy_id,
        memberId: instructor.id,
        profileId: instructor.profile_id,
        track: "teaching",
      });
    }

    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath(`/classes/${session.class_id}`);
    revalidatePath("/checkin");
    revalidatePath("/journey");
    revalidatePath("/notifications");
    return { success: "Aula encerrada." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para encerrar aula." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível encerrar a aula.",
    };
  }
}

export async function getSession(
  sessionId: string,
): Promise<ClassSessionRow | null> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      instructor_id,
      date,
      started_at,
      finished_at,
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

  const klass = academyFromClassesRel(
    data.classes as
      | { name: string; academy_id: string }
      | { name: string; academy_id: string }[]
      | null,
  );
  if (!klass || klass.academy_id !== member.academy_id) {
    return null;
  }

  return {
    id: data.id as string,
    class_id: data.class_id as string,
    instructor_id: data.instructor_id as string,
    date: data.date as string,
    started_at: (data.started_at as string | null) ?? null,
    finished_at: (data.finished_at as string | null) ?? null,
    status: data.status as ClassSessionRow["status"],
    class_name: klass.name,
  };
}

export async function listOpenSessions(): Promise<ClassSessionRow[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  let enrolledClassIds: string[] | null = null;
  if (member.role === "student") {
    const { data: roster, error: rosterError } = await supabase
      .from("class_members")
      .select("class_id")
      .eq("member_id", member.id);
    if (rosterError) throw rosterError;
    enrolledClassIds = (roster ?? []).map((row) => row.class_id as string);
    if (enrolledClassIds.length === 0) return [];
  }

  let query = supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      instructor_id,
      date,
      started_at,
      finished_at,
      status,
      classes!inner(name, academy_id)
    `,
    )
    .eq("status", "open")
    .order("started_at", { ascending: false });

  if (enrolledClassIds) {
    query = query.in("class_id", enrolledClassIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const klass = academyFromClassesRel(
      row.classes as
        | { name: string; academy_id: string }
        | { name: string; academy_id: string }[]
        | null,
    );
    if (!klass || klass.academy_id !== member.academy_id) return [];
    return [
      {
        id: row.id as string,
        class_id: row.class_id as string,
        instructor_id: row.instructor_id as string,
        date: row.date as string,
        started_at: (row.started_at as string | null) ?? null,
        finished_at: (row.finished_at as string | null) ?? null,
        status: row.status as ClassSessionRow["status"],
        class_name: klass.name,
      },
    ];
  });
}
