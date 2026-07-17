"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import {
  copySchedulesFromClassSchema,
  createClassSchema,
  createScheduleSchema,
  createSchedulesBulkSchema,
  deleteClassSchema,
  deleteScheduleDayOverrideSchema,
  deleteScheduleSchema,
  duplicateScheduleSchema,
  saveClassAutomationSchema,
  updateClassDefaultInstructorSchema,
  updateClassSchema,
  updateScheduleAutoOpenSchema,
  updateScheduleSchema,
  upsertScheduleDayOverrideSchema,
} from "@/lib/validations/classes";

export type ClassActionState = {
  error?: string;
  success?: string;
} | null;

export type ClassScheduleRow = {
  id: string;
  class_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  auto_open_enabled: boolean;
  auto_open_lead_minutes: number;
  auto_close_grace_minutes: number;
};

export type ScheduleDayOverrideRow = {
  id: string;
  class_id: string;
  schedule_id: string;
  date: string;
  cancelled: boolean;
  substitute_instructor_id: string | null;
  note: string | null;
};

export type ClassRow = {
  id: string;
  academy_id: string;
  unit_id: string | null;
  name: string;
  description: string | null;
  minimum_age: number | null;
  maximum_age: number | null;
  minimum_belt: string | null;
  maximum_belt: string | null;
  is_active: boolean;
  default_instructor_id: string | null;
  schedules?: ClassScheduleRow[];
};

export type AutoOpenInstructorOption = {
  id: string;
  name: string;
  role: string;
};

const SCHEDULE_SELECT =
  "id, class_id, weekday, start_time, end_time, auto_open_enabled, auto_open_lead_minutes, auto_close_grace_minutes";

function mapSchedule(row: ClassScheduleRow): ClassScheduleRow {
  return {
    id: row.id,
    class_id: row.class_id,
    weekday: row.weekday,
    start_time: row.start_time,
    end_time: row.end_time,
    auto_open_enabled: Boolean(row.auto_open_enabled),
    auto_open_lead_minutes: Number(row.auto_open_lead_minutes ?? 30),
    auto_close_grace_minutes: Number(row.auto_close_grace_minutes ?? 15),
  };
}

async function assertCanConfigureAutoOpen() {
  const member = await getActiveMembership();
  if (
    !can(member.role, "manage_classes") &&
    !can(member.role, "open_session")
  ) {
    throw new PermissionError(member.role, "manage_classes");
  }
  return member;
}

function firstValidationError(error: {
  flatten: () => {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}): string {
  const flat = error.flatten();
  const fieldMessage = Object.values(flat.fieldErrors).flat().find(Boolean);
  return fieldMessage ?? flat.formErrors[0] ?? "Dados inválidos";
}

function parseWeekdaysFromForm(formData: FormData): number[] {
  const raw = formData.getAll("weekdays");
  const values = raw.length > 0 ? raw : [formData.get("weekdays")];
  const parsed = values
    .flatMap((value) =>
      String(value ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  return [...new Set(parsed)].sort((a, b) => a - b);
}

function formOptional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

async function listEnrolledClassIds(
  memberId: string,
): Promise<string[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("member_id", memberId);

  if (error) throw error;
  return (data ?? []).map((row) => row.class_id as string);
}

async function assertStudentCanViewClass(
  memberId: string,
  role: string,
  classId: string,
): Promise<boolean> {
  if (role !== "student") return true;
  const ids = await listEnrolledClassIds(memberId);
  return (ids ?? []).includes(classId);
}

export async function listClasses(): Promise<ClassRow[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  let enrolledIds: string[] | null = null;
  if (member.role === "student") {
    enrolledIds = await listEnrolledClassIds(member.id);
    if (!enrolledIds || enrolledIds.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("classes")
    .select(
      `
      id,
      academy_id,
      unit_id,
      name,
      description,
      minimum_age,
      maximum_age,
      minimum_belt,
      maximum_belt,
      is_active,
      default_instructor_id,
      class_schedules(${SCHEDULE_SELECT})
    `,
    )
    .eq("academy_id", member.academy_id)
    .order("name");

  if (enrolledIds) {
    query = query.in("id", enrolledIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const schedules = Array.isArray(row.class_schedules)
      ? (row.class_schedules as ClassScheduleRow[]).map(mapSchedule)
      : [];
    return {
      id: row.id as string,
      academy_id: row.academy_id as string,
      unit_id: (row.unit_id as string | null) ?? null,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      minimum_age: (row.minimum_age as number | null) ?? null,
      maximum_age: (row.maximum_age as number | null) ?? null,
      minimum_belt: (row.minimum_belt as string | null) ?? null,
      maximum_belt: (row.maximum_belt as string | null) ?? null,
      is_active: Boolean(row.is_active),
      default_instructor_id:
        (row.default_instructor_id as string | null) ?? null,
      schedules: schedules.sort(
        (a, b) =>
          a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
      ),
    };
  });
}

export async function getClass(classId: string): Promise<ClassRow | null> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const allowed = await assertStudentCanViewClass(
    member.id,
    member.role,
    classId,
  );
  if (!allowed) return null;

  const { data, error } = await supabase
    .from("classes")
    .select(
      `
      id,
      academy_id,
      unit_id,
      name,
      description,
      minimum_age,
      maximum_age,
      minimum_belt,
      maximum_belt,
      is_active,
      default_instructor_id,
      class_schedules(${SCHEDULE_SELECT})
    `,
    )
    .eq("id", classId)
    .eq("academy_id", member.academy_id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;

  const schedules = Array.isArray(data.class_schedules)
    ? (data.class_schedules as ClassScheduleRow[]).map(mapSchedule)
    : [];

  return {
    id: data.id as string,
    academy_id: data.academy_id as string,
    unit_id: (data.unit_id as string | null) ?? null,
    name: data.name as string,
    description: (data.description as string | null) ?? null,
    minimum_age: (data.minimum_age as number | null) ?? null,
    maximum_age: (data.maximum_age as number | null) ?? null,
    minimum_belt: (data.minimum_belt as string | null) ?? null,
    maximum_belt: (data.maximum_belt as string | null) ?? null,
    is_active: Boolean(data.is_active),
    default_instructor_id:
      (data.default_instructor_id as string | null) ?? null,
    schedules: schedules.sort(
      (a, b) =>
        a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
    ),
  };
}

export async function createClass(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = createClassSchema.safeParse({
      name: formData.get("name"),
      description: formOptional(formData, "description"),
      unit_id: formOptional(formData, "unit_id"),
      minimum_age: formOptional(formData, "minimum_age"),
      maximum_age: formOptional(formData, "maximum_age"),
      minimum_belt: formOptional(formData, "minimum_belt"),
      maximum_belt: formOptional(formData, "maximum_belt"),
      is_active: formData.get("is_active") ?? "true",
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("classes")
      .insert({
        academy_id: actor.academy_id,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        unit_id: parsed.data.unit_id ?? null,
        minimum_age: parsed.data.minimum_age ?? null,
        maximum_age: parsed.data.maximum_age ?? null,
        minimum_belt: parsed.data.minimum_belt ?? null,
        maximum_belt: parsed.data.maximum_belt ?? null,
        is_active: parsed.data.is_active ?? true,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    redirect(`/classes/${data.id}`);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    throw err;
  }
}

export async function updateClass(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = updateClassSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      description: formOptional(formData, "description"),
      unit_id: formOptional(formData, "unit_id"),
      minimum_age: formOptional(formData, "minimum_age"),
      maximum_age: formOptional(formData, "maximum_age"),
      minimum_belt: formOptional(formData, "minimum_belt"),
      maximum_belt: formOptional(formData, "maximum_belt"),
      is_active: formData.get("is_active") ?? undefined,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("classes")
      .update({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        unit_id: parsed.data.unit_id ?? null,
        minimum_age: parsed.data.minimum_age ?? null,
        maximum_age: parsed.data.maximum_age ?? null,
        minimum_belt: parsed.data.minimum_belt ?? null,
        maximum_belt: parsed.data.maximum_belt ?? null,
        ...(parsed.data.is_active !== undefined
          ? { is_active: parsed.data.is_active }
          : {}),
      })
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.id}`);
    return { success: "Turma atualizada com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a turma.",
    };
  }
}

export async function deleteClass(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = deleteClassSchema.safeParse({
      id: formData.get("id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: fetchError } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!klass) {
      return { error: "Turma não encontrada." };
    }

    // Stop automation before removing / deactivating.
    await supabase
      .from("class_schedules")
      .update({ auto_open_enabled: false })
      .eq("class_id", parsed.data.id);

    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id);

    if (deleteError) {
      const { error: softError } = await supabase
        .from("classes")
        .update({ is_active: false })
        .eq("id", parsed.data.id)
        .eq("academy_id", actor.academy_id);

      if (softError) {
        return { error: softError.message };
      }

      revalidatePath("/classes");
      revalidatePath(`/classes/${parsed.data.id}`);
      return {
        success: `Turma "${klass.name}" inativada (há histórico vinculado).`,
      };
    }

    revalidatePath("/classes");
    return { success: `Turma "${klass.name}" excluída.` };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a turma.",
    };
  }
}

export async function addSchedule(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = createScheduleSchema.safeParse({
      class_id: formData.get("class_id"),
      weekday: formData.get("weekday"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) {
      return { error: classError.message };
    }
    if (!klass) {
      return { error: "Turma não encontrada." };
    }

    const { error } = await supabase.from("class_schedules").insert({
      class_id: parsed.data.class_id,
      weekday: parsed.data.weekday,
      start_time: normalizeTime(parsed.data.start_time),
      end_time: normalizeTime(parsed.data.end_time),
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.class_id}`);
    return { success: "Horário adicionado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar o horário.",
    };
  }
}

export async function addSchedulesBulk(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = createSchedulesBulkSchema.safeParse({
      class_id: formData.get("class_id"),
      weekdays: parseWeekdaysFromForm(formData),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    const rows = parsed.data.weekdays.map((weekday) => ({
      class_id: parsed.data.class_id,
      weekday,
      start_time: normalizeTime(parsed.data.start_time),
      end_time: normalizeTime(parsed.data.end_time),
    }));

    const { error } = await supabase.from("class_schedules").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success:
        rows.length === 1
          ? "Horário adicionado."
          : `${rows.length} horários adicionados.`,
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar os horários.",
    };
  }
}

export async function duplicateSchedule(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = duplicateScheduleSchema.safeParse({
      id: formData.get("id"),
      class_id: formData.get("class_id"),
      weekdays: parseWeekdaysFromForm(formData),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    const { data: source, error: sourceError } = await supabase
      .from("class_schedules")
      .select(
        "weekday, start_time, end_time, auto_open_enabled, auto_open_lead_minutes, auto_close_grace_minutes",
      )
      .eq("id", parsed.data.id)
      .eq("class_id", parsed.data.class_id)
      .maybeSingle();

    if (sourceError) return { error: sourceError.message };
    if (!source) return { error: "Horário não encontrado." };

    const targetDays = parsed.data.weekdays.filter(
      (day) => day !== source.weekday,
    );
    if (targetDays.length === 0) {
      return { error: "Selecione outro dia para duplicar." };
    }

    const rows = targetDays.map((weekday) => ({
      class_id: parsed.data.class_id,
      weekday,
      start_time: source.start_time,
      end_time: source.end_time,
      auto_open_enabled: source.auto_open_enabled,
      auto_open_lead_minutes: source.auto_open_lead_minutes,
      auto_close_grace_minutes: source.auto_close_grace_minutes,
    }));

    const { error } = await supabase.from("class_schedules").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success:
        rows.length === 1
          ? "Horário duplicado."
          : `Horário duplicado em ${rows.length} dias.`,
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível duplicar o horário.",
    };
  }
}

export async function copySchedulesFromClass(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const replaceRaw = formData.get("replace_existing");
    const parsed = copySchedulesFromClassSchema.safeParse({
      class_id: formData.get("class_id"),
      source_class_id: formData.get("source_class_id"),
      replace_existing: replaceRaw === "on" || replaceRaw === "true",
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    if (parsed.data.class_id === parsed.data.source_class_id) {
      return { error: "Escolha outra turma para copiar." };
    }

    const supabase = await createClient();
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id")
      .eq("academy_id", actor.academy_id)
      .in("id", [parsed.data.class_id, parsed.data.source_class_id]);

    if (classesError) return { error: classesError.message };
    if ((classes ?? []).length !== 2) {
      return { error: "Turma não encontrada." };
    }

    const { data: sourceRows, error: sourceError } = await supabase
      .from("class_schedules")
      .select(
        "weekday, start_time, end_time, auto_open_enabled, auto_open_lead_minutes, auto_close_grace_minutes",
      )
      .eq("class_id", parsed.data.source_class_id);

    if (sourceError) return { error: sourceError.message };
    if (!sourceRows?.length) {
      return { error: "A turma de origem não tem horários." };
    }

    if (parsed.data.replace_existing) {
      const { error: deleteError } = await supabase
        .from("class_schedules")
        .delete()
        .eq("class_id", parsed.data.class_id);
      if (deleteError) return { error: deleteError.message };
    }

    const rows = sourceRows.map((row) => ({
      class_id: parsed.data.class_id,
      weekday: row.weekday,
      start_time: row.start_time,
      end_time: row.end_time,
      auto_open_enabled: row.auto_open_enabled,
      auto_open_lead_minutes: row.auto_open_lead_minutes,
      auto_close_grace_minutes: row.auto_close_grace_minutes,
    }));

    const { error } = await supabase.from("class_schedules").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success: `Grade copiada (${rows.length} horário${rows.length === 1 ? "" : "s"}).`,
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível copiar a grade.",
    };
  }
}

export async function updateSchedule(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = updateScheduleSchema.safeParse({
      id: formData.get("id"),
      weekday: formData.get("weekday"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const classId = formOptional(formData, "class_id");
    if (!classId) {
      return { error: "Turma inválida." };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) {
      return { error: classError.message };
    }
    if (!klass) {
      return { error: "Turma não encontrada." };
    }

    const { error } = await supabase
      .from("class_schedules")
      .update({
        weekday: parsed.data.weekday,
        start_time: normalizeTime(parsed.data.start_time),
        end_time: normalizeTime(parsed.data.end_time),
      })
      .eq("id", parsed.data.id)
      .eq("class_id", classId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    return { success: "Horário atualizado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o horário.",
    };
  }
}

export async function deleteSchedule(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCapability("manage_classes");

    const parsed = deleteScheduleSchema.safeParse({
      id: formData.get("id"),
      class_id: formData.get("class_id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) {
      return { error: classError.message };
    }
    if (!klass) {
      return { error: "Turma não encontrada." };
    }

    const { error } = await supabase
      .from("class_schedules")
      .delete()
      .eq("id", parsed.data.id)
      .eq("class_id", parsed.data.class_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classes");
    revalidatePath(`/classes/${parsed.data.class_id}`);
    return { success: "Horário removido." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar turmas." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível remover o horário.",
    };
  }
}

export async function listAutoOpenInstructors(): Promise<
  AutoOpenInstructorOption[]
> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academy_members")
    .select("id, role, profiles(name)")
    .eq("academy_id", member.academy_id)
    .eq("status", "active")
    .in("role", [
      "owner",
      "administrator",
      "instructor",
      "assistant_instructor",
    ])
    .order("role");

  if (error) throw error;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    return {
      id: row.id as string,
      name: (profile as { name?: string } | null)?.name ?? "Sem nome",
      role: row.role as string,
    };
  });
}

export async function updateClassDefaultInstructor(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCanConfigureAutoOpen();

    const parsed = updateClassDefaultInstructorSchema.safeParse({
      class_id: formData.get("class_id"),
      default_instructor_id: formData.get("default_instructor_id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    if (parsed.data.default_instructor_id) {
      const { data: instructor, error: instructorError } = await supabase
        .from("academy_members")
        .select("id, role, status")
        .eq("id", parsed.data.default_instructor_id)
        .eq("academy_id", actor.academy_id)
        .maybeSingle();

      if (instructorError) return { error: instructorError.message };
      if (
        !instructor ||
        instructor.status !== "active" ||
        ![
          "owner",
          "administrator",
          "instructor",
          "assistant_instructor",
        ].includes(instructor.role as string)
      ) {
        return { error: "Professor inválido para abertura automática." };
      }
    }

    const { error } = await supabase
      .from("classes")
      .update({
        default_instructor_id: parsed.data.default_instructor_id,
      })
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id);

    if (error) return { error: error.message };

    revalidatePath(`/classes/${parsed.data.class_id}`);
    return { success: "Professor da abertura automática salvo." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para configurar abertura automática." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o professor.",
    };
  }
}

const STAFF_ROLES = [
  "owner",
  "administrator",
  "instructor",
  "assistant_instructor",
] as const;

async function assertInstructorEligible(
  supabase: Awaited<ReturnType<typeof createClient>>,
  academyId: string,
  instructorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: instructor, error } = await supabase
    .from("academy_members")
    .select("id, role, status")
    .eq("id", instructorId)
    .eq("academy_id", academyId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (
    !instructor ||
    instructor.status !== "active" ||
    !STAFF_ROLES.includes(instructor.role as (typeof STAFF_ROLES)[number])
  ) {
    return { ok: false, error: "Professor inválido para abertura automática." };
  }
  return { ok: true };
}

export async function saveClassAutomation(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCanConfigureAutoOpen();

    const enabledRaw = formData.get("auto_open_enabled");
    const parsed = saveClassAutomationSchema.safeParse({
      class_id: formData.get("class_id"),
      default_instructor_id: formData.get("default_instructor_id"),
      auto_open_enabled: enabledRaw === "on" || enabledRaw === "true",
      auto_open_lead_minutes: formData.get("auto_open_lead_minutes") || 30,
      auto_close_grace_minutes: formData.get("auto_close_grace_minutes") || 15,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    if (parsed.data.auto_open_enabled && !parsed.data.default_instructor_id) {
      return {
        error: "Escolha o professor responsável antes de ativar a automação.",
      };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    if (parsed.data.default_instructor_id) {
      const check = await assertInstructorEligible(
        supabase,
        actor.academy_id,
        parsed.data.default_instructor_id,
      );
      if (!check.ok) return { error: check.error };
    }

    const { error: classUpdateError } = await supabase
      .from("classes")
      .update({
        default_instructor_id: parsed.data.default_instructor_id,
      })
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id);

    if (classUpdateError) return { error: classUpdateError.message };

    const { data: schedules, error: schedulesError } = await supabase
      .from("class_schedules")
      .select("id")
      .eq("class_id", parsed.data.class_id);

    if (schedulesError) return { error: schedulesError.message };

    if (schedules && schedules.length > 0) {
      const { error: schedulesUpdateError } = await supabase
        .from("class_schedules")
        .update({
          auto_open_enabled: parsed.data.auto_open_enabled,
          auto_open_lead_minutes: parsed.data.auto_open_lead_minutes,
          auto_close_grace_minutes: parsed.data.auto_close_grace_minutes,
        })
        .eq("class_id", parsed.data.class_id);

      if (schedulesUpdateError) return { error: schedulesUpdateError.message };
    } else if (parsed.data.auto_open_enabled) {
      return {
        error: "Cadastre pelo menos um horário antes de ativar a automação.",
      };
    }

    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success: parsed.data.auto_open_enabled
        ? "Automação salva: a aula abre sozinha nos horários da grade."
        : "Automação desativada. Professor atualizado.",
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para configurar abertura automática." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a automação.",
    };
  }
}

export async function updateScheduleAutoOpen(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCanConfigureAutoOpen();

    const enabledRaw = formData.get("auto_open_enabled");
    const parsed = updateScheduleAutoOpenSchema.safeParse({
      id: formData.get("id"),
      class_id: formData.get("class_id"),
      auto_open_enabled: enabledRaw === "on" || enabledRaw === "true",
      auto_open_lead_minutes: formData.get("auto_open_lead_minutes") || 30,
      auto_close_grace_minutes: formData.get("auto_close_grace_minutes") || 15,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id, default_instructor_id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    if (parsed.data.auto_open_enabled && !klass.default_instructor_id) {
      return {
        error: "Escolha o professor da abertura automática antes de ativar.",
      };
    }

    const { error } = await supabase
      .from("class_schedules")
      .update({
        auto_open_enabled: parsed.data.auto_open_enabled,
        auto_open_lead_minutes: parsed.data.auto_open_enabled
          ? parsed.data.auto_open_lead_minutes
          : 30,
        auto_close_grace_minutes: parsed.data.auto_open_enabled
          ? parsed.data.auto_close_grace_minutes
          : 15,
      })
      .eq("id", parsed.data.id)
      .eq("class_id", parsed.data.class_id);

    if (error) return { error: error.message };

    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success: parsed.data.auto_open_enabled
        ? "Abertura automática ativada."
        : "Abertura automática desativada.",
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para configurar abertura automática." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a abertura automática.",
    };
  }
}

export async function listScheduleDayOverrides(
  classId: string,
): Promise<ScheduleDayOverrideRow[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 60);

  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("class_schedule_day_overrides")
    .select(
      "id, class_id, schedule_id, date, cancelled, substitute_instructor_id, note",
    )
    .eq("class_id", classId)
    .eq("academy_id", member.academy_id)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    class_id: row.class_id as string,
    schedule_id: row.schedule_id as string,
    date: row.date as string,
    cancelled: Boolean(row.cancelled),
    substitute_instructor_id:
      (row.substitute_instructor_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
  }));
}

export async function upsertScheduleDayOverride(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCanConfigureAutoOpen();

    const parsed = upsertScheduleDayOverrideSchema.safeParse({
      class_id: formData.get("class_id"),
      schedule_id: formData.get("schedule_id"),
      date: formData.get("date"),
      mode: formData.get("mode"),
      substitute_instructor_id: formData.get("substitute_instructor_id"),
      note: formData.get("note") ?? "",
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const cancelled = parsed.data.mode === "cancel";
    const substituteId = cancelled
      ? null
      : parsed.data.substitute_instructor_id;

    const supabase = await createClient();
    const { data: klass, error: classError } = await supabase
      .from("classes")
      .select("id")
      .eq("id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (classError) return { error: classError.message };
    if (!klass) return { error: "Turma não encontrada." };

    const { data: schedule, error: scheduleError } = await supabase
      .from("class_schedules")
      .select("id, weekday")
      .eq("id", parsed.data.schedule_id)
      .eq("class_id", parsed.data.class_id)
      .maybeSingle();

    if (scheduleError) return { error: scheduleError.message };
    if (!schedule) return { error: "Horário não encontrado." };

    const [year, month, day] = parsed.data.date.split("-").map(Number);
    const weekdayOfDate = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    if (weekdayOfDate !== schedule.weekday) {
      return {
        error: "A data precisa cair no mesmo dia da semana do horário.",
      };
    }

    if (substituteId) {
      const check = await assertInstructorEligible(
        supabase,
        actor.academy_id,
        substituteId,
      );
      if (!check.ok) return { error: check.error };
    }

    const { error } = await supabase.from("class_schedule_day_overrides").upsert(
      {
        academy_id: actor.academy_id,
        class_id: parsed.data.class_id,
        schedule_id: parsed.data.schedule_id,
        date: parsed.data.date,
        cancelled,
        substitute_instructor_id: substituteId,
        note: parsed.data.note ?? null,
        created_by: actor.id,
      },
      { onConflict: "schedule_id,date" },
    );

    if (error) return { error: error.message };

    revalidatePath(`/classes/${parsed.data.class_id}`);
    return {
      success: cancelled
        ? "Treino cancelado neste dia (grade mantida)."
        : "Professor substituto definido para este dia.",
    };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para configurar exceções." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a exceção.",
    };
  }
}

export async function deleteScheduleDayOverride(
  _prevState: ClassActionState,
  formData: FormData,
): Promise<ClassActionState> {
  try {
    const actor = await assertCanConfigureAutoOpen();

    const parsed = deleteScheduleDayOverrideSchema.safeParse({
      id: formData.get("id"),
      class_id: formData.get("class_id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("class_schedule_day_overrides")
      .delete()
      .eq("id", parsed.data.id)
      .eq("class_id", parsed.data.class_id)
      .eq("academy_id", actor.academy_id);

    if (error) return { error: error.message };

    revalidatePath(`/classes/${parsed.data.class_id}`);
    return { success: "Exceção removida. Grade normal restaurada." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para remover exceções." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível remover a exceção.",
    };
  }
}
