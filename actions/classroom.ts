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
import { createVirtualLessonSchema } from "@/lib/validations/classroom";

export type ClassroomActionState = {
  error?: string;
  success?: string;
} | null;

export type VirtualLessonRow = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_video_id: string;
  orientation: "horizontal" | "vertical";
  visibility: "academy" | "class";
  class_id: string | null;
  class_name: string | null;
  is_published: boolean;
  created_at: string;
  created_by_name: string;
};

type ListVirtualLessonsOptions = {
  classId?: string;
};

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

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function mapLesson(row: Record<string, unknown>): VirtualLessonRow {
  const profileEntry = row.profiles as
    | { name: string }
    | { name: string }[]
    | null;
  const author = Array.isArray(profileEntry) ? profileEntry[0] : profileEntry;

  const classEntry = row.classes as
    | { name: string }
    | { name: string }[]
    | null;
  const klass = Array.isArray(classEntry) ? classEntry[0] : classEntry;

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    youtube_url: row.youtube_url as string,
    youtube_video_id: row.youtube_video_id as string,
    orientation: row.orientation as "horizontal" | "vertical",
    visibility: row.visibility as "academy" | "class",
    class_id: (row.class_id as string | null) ?? null,
    class_name: klass?.name ?? null,
    is_published: Boolean(row.is_published),
    created_at: row.created_at as string,
    created_by_name: author?.name ?? "Equipe",
  };
}

export async function listVirtualLessons(
  options?: ListVirtualLessonsOptions,
): Promise<VirtualLessonRow[]> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_virtual_lessons")) {
    throw new PermissionError(member.role, "view_virtual_lessons");
  }

  const supabase = await createClient();
  let query = supabase
    .from("virtual_lessons")
    .select(
      `
      id,
      title,
      description,
      youtube_url,
      youtube_video_id,
      orientation,
      visibility,
      class_id,
      is_published,
      created_at,
      created_by,
      profiles!created_by(name),
      classes!class_id(name)
    `,
    )
    .eq("academy_id", member.academy_id)
    .order("created_at", { ascending: false });

  if (options?.classId) {
    query = query.eq("class_id", options.classId);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapLesson(row as Record<string, unknown>));
}

export async function getVirtualLesson(
  lessonId: string,
): Promise<VirtualLessonRow | null> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_virtual_lessons")) {
    throw new PermissionError(member.role, "view_virtual_lessons");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_lessons")
    .select(
      `
      id,
      title,
      description,
      youtube_url,
      youtube_video_id,
      orientation,
      visibility,
      class_id,
      is_published,
      created_at,
      created_by,
      profiles!created_by(name),
      classes!class_id(name)
    `,
    )
    .eq("id", lessonId)
    .eq("academy_id", member.academy_id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  return mapLesson(data as Record<string, unknown>);
}

export async function createVirtualLesson(
  _prevState: ClassroomActionState,
  formData: FormData,
): Promise<ClassroomActionState> {
  try {
    const actor = await assertCapability("manage_virtual_lessons");

    const parsed = createVirtualLessonSchema.safeParse({
      title: formValue(formData, "title"),
      description: formValue(formData, "description"),
      youtube_url: formValue(formData, "youtube_url"),
      orientation: formValue(formData, "orientation"),
      visibility: formValue(formData, "visibility"),
      class_id: formValue(formData, "class_id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();

    if (parsed.data.class_id) {
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
    }

    const { data, error } = await supabase
      .from("virtual_lessons")
      .insert({
        academy_id: actor.academy_id,
        title: parsed.data.title,
        description: parsed.data.description,
        youtube_url: parsed.data.youtube_url,
        youtube_video_id: parsed.data.youtube_video_id,
        orientation: parsed.data.orientation,
        visibility: parsed.data.visibility,
        class_id: parsed.data.class_id,
        is_published: true,
        created_by: actor.profile_id,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classroom");
    redirect(`/classroom/${data.id}`);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar aulas virtuais." };
    }
    throw err;
  }
}

export async function deleteVirtualLesson(
  lessonId: string,
): Promise<ClassroomActionState> {
  try {
    const actor = await assertCapability("manage_virtual_lessons");
    const supabase = await createClient();
    const { error } = await supabase
      .from("virtual_lessons")
      .delete()
      .eq("id", lessonId)
      .eq("academy_id", actor.academy_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    return { success: "Aula virtual removida." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar aulas virtuais." };
    }
    throw err;
  }
}
