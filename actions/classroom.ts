"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import type { LessonCategory } from "@/lib/classroom/categories";
import { createClient } from "@/lib/supabase/server";
import {
  createLessonCommentSchema,
  createVirtualLessonSchema,
} from "@/lib/validations/classroom";

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
  category: LessonCategory | null;
  class_id: string | null;
  class_name: string | null;
  is_published: boolean;
  created_at: string;
  created_by_name: string;
  is_favorite: boolean;
  is_liked: boolean;
  like_count: number;
  is_watched: boolean;
};

export type VirtualLessonComment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  is_own: boolean;
  parent_id: string | null;
  replies: VirtualLessonComment[];
};

type ListVirtualLessonsOptions = {
  classId?: string;
  category?: LessonCategory;
  q?: string;
  favoritesOnly?: boolean;
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

function mapLesson(
  row: Record<string, unknown>,
  favoriteIds: Set<string>,
  likedIds: Set<string> = new Set(),
  likeCounts: Map<string, number> = new Map(),
  watchedIds: Set<string> = new Set(),
): VirtualLessonRow {
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

  const id = row.id as string;

  return {
    id,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    youtube_url: row.youtube_url as string,
    youtube_video_id: row.youtube_video_id as string,
    orientation: row.orientation as "horizontal" | "vertical",
    visibility: row.visibility as "academy" | "class",
    category: (row.category as LessonCategory | null) ?? null,
    class_id: (row.class_id as string | null) ?? null,
    class_name: klass?.name ?? null,
    is_published: Boolean(row.is_published),
    created_at: row.created_at as string,
    created_by_name: author?.name ?? "Equipe",
    is_favorite: favoriteIds.has(id),
    is_liked: likedIds.has(id),
    like_count: likeCounts.get(id) ?? 0,
    is_watched: watchedIds.has(id),
  };
}

async function loadFavoriteIds(
  memberId: string,
  lessonIds: string[],
): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("virtual_lesson_favorites")
    .select("lesson_id")
    .eq("member_id", memberId)
    .in("lesson_id", lessonIds);
  return new Set((data ?? []).map((row) => row.lesson_id as string));
}

async function loadWatchedIds(
  memberId: string,
  lessonIds: string[],
): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("virtual_lesson_watches")
    .select("lesson_id")
    .eq("member_id", memberId)
    .in("lesson_id", lessonIds);
  return new Set((data ?? []).map((row) => row.lesson_id as string));
}

async function loadLikeState(
  memberId: string,
  lessonIds: string[],
): Promise<{ likedIds: Set<string>; likeCounts: Map<string, number> }> {
  const likedIds = new Set<string>();
  const likeCounts = new Map<string, number>();
  if (lessonIds.length === 0) return { likedIds, likeCounts };

  const supabase = await createClient();
  const { data } = await supabase
    .from("virtual_lesson_likes")
    .select("lesson_id, member_id")
    .in("lesson_id", lessonIds);

  for (const row of data ?? []) {
    const lessonId = row.lesson_id as string;
    likeCounts.set(lessonId, (likeCounts.get(lessonId) ?? 0) + 1);
    if ((row.member_id as string) === memberId) {
      likedIds.add(lessonId);
    }
  }

  return { likedIds, likeCounts };
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
      category,
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
  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw error;
  }

  let rows = data ?? [];

  if (options?.q?.trim()) {
    const needle = options.q.trim().toLowerCase();
    rows = rows.filter((row) => {
      const title = String(row.title ?? "").toLowerCase();
      const description = String(row.description ?? "").toLowerCase();
      return title.includes(needle) || description.includes(needle);
    });
  }

  const ids = rows.map((row) => row.id as string);
  let favoriteIds = await loadFavoriteIds(member.id, ids);
  const [{ likedIds, likeCounts }, watchedIds] = await Promise.all([
    loadLikeState(member.id, ids),
    loadWatchedIds(member.id, ids),
  ]);

  if (options?.favoritesOnly) {
    if (favoriteIds.size === 0) return [];
    rows = rows.filter((row) => favoriteIds.has(row.id as string));
    favoriteIds = new Set(rows.map((row) => row.id as string));
  }

  return rows.map((row) =>
    mapLesson(
      row as Record<string, unknown>,
      favoriteIds,
      likedIds,
      likeCounts,
      watchedIds,
    ),
  );
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
      category,
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

  const favoriteIds = await loadFavoriteIds(member.id, [lessonId]);
  const [{ likedIds, likeCounts }, watchedIds] = await Promise.all([
    loadLikeState(member.id, [lessonId]),
    loadWatchedIds(member.id, [lessonId]),
  ]);
  return mapLesson(
    data as Record<string, unknown>,
    favoriteIds,
    likedIds,
    likeCounts,
    watchedIds,
  );
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
      category: formValue(formData, "category"),
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
        category: parsed.data.category,
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
    return { success: "Vídeo excluído." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar aulas virtuais." };
    }
    throw err;
  }
}

export async function updateVirtualLesson(
  _prevState: ClassroomActionState,
  formData: FormData,
): Promise<ClassroomActionState> {
  try {
    const actor = await assertCapability("manage_virtual_lessons");
    const lessonId = formValue(formData, "id");
    if (!lessonId) {
      return { error: "Aula inválida." };
    }

    const parsed = createVirtualLessonSchema.safeParse({
      title: formValue(formData, "title"),
      description: formValue(formData, "description"),
      youtube_url: formValue(formData, "youtube_url"),
      orientation: formValue(formData, "orientation"),
      visibility: formValue(formData, "visibility"),
      class_id: formValue(formData, "class_id"),
      category: formValue(formData, "category"),
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

      if (classError) return { error: classError.message };
      if (!klass) return { error: "Turma não encontrada." };
    }

    const { error } = await supabase
      .from("virtual_lessons")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        youtube_url: parsed.data.youtube_url,
        youtube_video_id: parsed.data.youtube_video_id,
        orientation: parsed.data.orientation,
        visibility: parsed.data.visibility,
        class_id: parsed.data.class_id,
        category: parsed.data.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .eq("academy_id", actor.academy_id);

    if (error) return { error: error.message };

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    redirect(`/classroom/${lessonId}`);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar aulas virtuais." };
    }
    throw err;
  }
}

export async function toggleLessonLike(
  lessonId: string,
): Promise<{ liked: boolean; like_count: number; error?: string }> {
  try {
    const member = await getActiveMembership();
    if (!can(member.role, "view_virtual_lessons")) {
      return { liked: false, like_count: 0, error: "Sem permissão." };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("virtual_lesson_likes")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("virtual_lesson_likes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        return { liked: true, like_count: 0, error: error.message };
      }
    } else {
      const { error } = await supabase.from("virtual_lesson_likes").insert({
        lesson_id: lessonId,
        member_id: member.id,
      });
      if (error) {
        return { liked: false, like_count: 0, error: error.message };
      }
    }

    const { count } = await supabase
      .from("virtual_lesson_likes")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    return {
      liked: !existing,
      like_count: count ?? 0,
    };
  } catch {
    return {
      liked: false,
      like_count: 0,
      error: "Não foi possível atualizar a curtida.",
    };
  }
}

export async function markLessonWatched(
  lessonId: string,
): Promise<{ watched: boolean; error?: string }> {
  try {
    const member = await getActiveMembership();
    if (!can(member.role, "view_virtual_lessons")) {
      return { watched: false, error: "Sem permissão." };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("virtual_lesson_watches")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existing) {
      return { watched: true };
    }

    const { error } = await supabase.from("virtual_lesson_watches").insert({
      lesson_id: lessonId,
      member_id: member.id,
    });
    if (error) return { watched: false, error: error.message };

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    return { watched: true };
  } catch {
    return { watched: false, error: "Não foi possível marcar como assistido." };
  }
}

export async function toggleLessonFavorite(
  lessonId: string,
): Promise<{ favorited: boolean; error?: string }> {
  try {
    const member = await getActiveMembership();
    if (!can(member.role, "view_virtual_lessons")) {
      return { favorited: false, error: "Sem permissão." };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("virtual_lesson_favorites")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("virtual_lesson_favorites")
        .delete()
        .eq("id", existing.id);
      if (error) return { favorited: true, error: error.message };
      revalidatePath("/classroom");
      revalidatePath(`/classroom/${lessonId}`);
      return { favorited: false };
    }

    const { error } = await supabase.from("virtual_lesson_favorites").insert({
      lesson_id: lessonId,
      member_id: member.id,
    });
    if (error) return { favorited: false, error: error.message };

    revalidatePath("/classroom");
    revalidatePath(`/classroom/${lessonId}`);
    return { favorited: true };
  } catch {
    return { favorited: false, error: "Não foi possível atualizar favorito." };
  }
}

export async function listLessonComments(
  lessonId: string,
): Promise<VirtualLessonComment[]> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_virtual_lessons")) {
    throw new PermissionError(member.role, "view_virtual_lessons");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("virtual_lesson_comments")
    .select("id, body, created_at, member_id, parent_id")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const memberIds = [...new Set(rows.map((row) => row.member_id as string))];
  const nameByMemberId = new Map<string, string>();

  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("academy_members")
      .select("id, profiles!profile_id(name)")
      .in("id", memberIds);

    for (const row of members ?? []) {
      const profile = row.profiles as
        | { name: string }
        | { name: string }[]
        | null;
      const author = Array.isArray(profile) ? profile[0] : profile;
      nameByMemberId.set(row.id as string, author?.name ?? "Membro");
    }
  }

  const mapped = rows.map((row) => ({
    id: row.id as string,
    body: row.body as string,
    created_at: row.created_at as string,
    author_name: nameByMemberId.get(row.member_id as string) ?? "Membro",
    is_own: (row.member_id as string) === member.id,
    parent_id: (row.parent_id as string | null) ?? null,
    replies: [] as VirtualLessonComment[],
  }));

  const roots: VirtualLessonComment[] = [];
  const byId = new Map(mapped.map((c) => [c.id, c]));

  for (const comment of mapped) {
    if (comment.parent_id) {
      const parent = byId.get(comment.parent_id);
      if (parent && !parent.parent_id) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    } else {
      roots.push(comment);
    }
  }

  return roots;
}

export async function addLessonComment(
  _prevState: ClassroomActionState,
  formData: FormData,
): Promise<ClassroomActionState> {
  try {
    const member = await getActiveMembership();
    if (!can(member.role, "view_virtual_lessons")) {
      return { error: "Sem permissão." };
    }

    const parsed = createLessonCommentSchema.safeParse({
      lesson_id: formValue(formData, "lesson_id"),
      body: formValue(formData, "body"),
      parent_id: formValue(formData, "parent_id"),
    });
    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();

    if (parsed.data.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from("virtual_lesson_comments")
        .select("id, lesson_id, parent_id")
        .eq("id", parsed.data.parent_id)
        .maybeSingle();

      if (parentError) return { error: parentError.message };
      if (!parent || parent.lesson_id !== parsed.data.lesson_id) {
        return { error: "Comentário pai inválido." };
      }
      if (parent.parent_id) {
        return { error: "Responda ao comentário principal." };
      }
    }

    const { error } = await supabase.from("virtual_lesson_comments").insert({
      lesson_id: parsed.data.lesson_id,
      member_id: member.id,
      body: parsed.data.body,
      parent_id: parsed.data.parent_id ?? null,
    });

    if (error) return { error: error.message };

    revalidatePath(`/classroom/${parsed.data.lesson_id}`);
    return {
      success: parsed.data.parent_id
        ? "Resposta publicada."
        : "Comentário publicado.",
    };
  } catch {
    return { error: "Não foi possível comentar." };
  }
}

export async function deleteLessonComment(
  commentId: string,
  lessonId: string,
): Promise<ClassroomActionState> {
  try {
    await getActiveMembership();
    const supabase = await createClient();
    const { error } = await supabase
      .from("virtual_lesson_comments")
      .delete()
      .eq("id", commentId);

    if (error) return { error: error.message };

    revalidatePath(`/classroom/${lessonId}`);
    return { success: "Comentário removido." };
  } catch {
    return { error: "Não foi possível remover." };
  }
}
