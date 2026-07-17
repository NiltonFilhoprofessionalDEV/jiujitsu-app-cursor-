"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@/lib/validations/announcements";

export type AnnouncementActionState = {
  error?: string;
  success?: string;
} | null;

export type AnnouncementRow = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  created_by_name: string;
  class_id: string | null;
  class_name: string | null;
  is_read: boolean;
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

async function listEnrolledClassIds(memberId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("member_id", memberId);

  if (error) throw error;
  return (data ?? []).map((row) => row.class_id as string);
}

async function resolveNotifyProfileIds(input: {
  academyId: string;
  classId: string | null;
  actorProfileId: string;
}): Promise<{ profileIds: string[]; error?: string }> {
  const supabase = await createClient();

  if (input.classId) {
    const { data: roster, error } = await supabase
      .from("class_members")
      .select(
        `
        member_id,
        academy_members!member_id(
          profile_id,
          status,
          academy_id
        )
      `,
      )
      .eq("class_id", input.classId);

    if (error) return { profileIds: [], error: error.message };

    const profileIds = [
      ...new Set(
        (roster ?? [])
          .map((row) => {
            const member = row.academy_members as
              | {
                  profile_id: string | null;
                  status: string;
                  academy_id: string;
                }
              | {
                  profile_id: string | null;
                  status: string;
                  academy_id: string;
                }[]
              | null;
            const am = Array.isArray(member) ? member[0] : member;
            if (!am) return null;
            if (am.academy_id !== input.academyId) return null;
            if (am.status !== "active") return null;
            return am.profile_id;
          })
          .filter((id): id is string => Boolean(id))
          .filter((id) => id !== input.actorProfileId),
      ),
    ];

    return { profileIds };
  }

  const { data: members, error } = await supabase
    .from("academy_members")
    .select("profile_id")
    .eq("academy_id", input.academyId)
    .eq("status", "active");

  if (error) return { profileIds: [], error: error.message };

  const profileIds = [
    ...new Set(
      (members ?? [])
        .map((m) => m.profile_id as string | null)
        .filter((id): id is string => Boolean(id))
        .filter((id) => id !== input.actorProfileId),
    ),
  ];

  return { profileIds };
}

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  const member = await getActiveMembership();
  if (!can(member.role, "view_announcements")) {
    throw new PermissionError(member.role, "view_announcements");
  }

  const supabase = await createClient();
  const baseSelect = `
      id,
      title,
      description,
      created_at,
      created_by,
      class_id,
      classes(name),
      profiles!created_by(name)
  `;

  const withReads = await supabase
    .from("announcements")
    .select(`${baseSelect}, announcement_reads(profile_id)`)
    .eq("academy_id", member.academy_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fallback when announcement_reads / class_id migration is not applied yet.
  const { data, error } = withReads.error
    ? await supabase
        .from("announcements")
        .select(
          `
      id,
      title,
      description,
      created_at,
      created_by,
      profiles!created_by(name)
  `,
        )
        .eq("academy_id", member.academy_id)
        .order("created_at", { ascending: false })
        .limit(50)
    : withReads;

  if (error) {
    throw error;
  }

  let enrolledClassIds: string[] | null = null;
  if (member.role === "student" || member.role === "guardian") {
    enrolledClassIds = await listEnrolledClassIds(member.id);
  }

  return (data ?? [])
    .map((row) => {
      const profile = row.profiles as
        | { name: string }
        | { name: string }[]
        | null;
      const author = Array.isArray(profile) ? profile[0] : profile;
      const klass = "classes" in row
        ? (row.classes as { name: string } | { name: string }[] | null)
        : null;
      const classRow = Array.isArray(klass) ? klass[0] : klass;
      const class_id =
        "class_id" in row ? ((row.class_id as string | null) ?? null) : null;
      const reads =
        "announcement_reads" in row
          ? (row.announcement_reads as
              | { profile_id: string }
              | { profile_id: string }[]
              | null)
          : null;
      const is_read = Array.isArray(reads)
        ? reads.length > 0
        : Boolean(reads && "profile_id" in reads ? reads.profile_id : false);
      return {
        id: row.id as string,
        title: row.title as string,
        description: row.description as string,
        created_at: row.created_at as string,
        created_by_name: author?.name ?? "Equipe",
        class_id,
        class_name: classRow?.name ?? null,
        is_read: withReads.error ? true : is_read,
      };
    })
    .filter((row) => {
      if (!enrolledClassIds) return true;
      if (!row.class_id) return true;
      return enrolledClassIds.includes(row.class_id);
    });
}

export async function markAnnouncementRead(
  announcementId: string,
): Promise<AnnouncementActionState> {
  try {
    const member = await getActiveMembership();
    if (!can(member.role, "view_announcements")) {
      return { error: "Sem permissão." };
    }
    if (!announcementId) {
      return { error: "Aviso inválido." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("announcement_reads").upsert(
      {
        announcement_id: announcementId,
        profile_id: member.profile_id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "announcement_id,profile_id" },
    );

    if (error) return { error: error.message };

    revalidatePath("/announcements");
    revalidatePath("/notifications");
    revalidatePath("/menu");
    revalidatePath("/journey");
    revalidatePath("/home");
    revalidatePath("/", "layout");
    return { success: "Aviso marcado como lido." };
  } catch {
    return { error: "Não foi possível marcar o aviso." };
  }
}

export async function createAnnouncement(
  _prevState: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  try {
    const actor = await assertCapability("manage_announcements");

    const parsed = createAnnouncementSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      class_id: formData.get("class_id") ?? "",
      // Always notify on publish — announcements must appear in Notifications.
      notify_members: formData.get("notify_members") ?? "on",
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();

    let className: string | null = null;
    if (parsed.data.class_id) {
      const { data: klass, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", parsed.data.class_id)
        .eq("academy_id", actor.academy_id)
        .maybeSingle();

      if (classError) return { error: classError.message };
      if (!klass) return { error: "Turma não encontrada." };
      className = klass.name as string;
    }

    const { error: insertError } = await supabase.from("announcements").insert({
      academy_id: actor.academy_id,
      title: parsed.data.title,
      description: parsed.data.description,
      created_by: actor.profile_id,
      class_id: parsed.data.class_id,
    });

    if (insertError) {
      return { error: insertError.message };
    }

    if (parsed.data.notify_members) {
      const { profileIds, error: resolveError } = await resolveNotifyProfileIds({
        academyId: actor.academy_id,
        classId: parsed.data.class_id,
        actorProfileId: actor.profile_id,
      });

      if (resolveError) {
        return { error: resolveError };
      }

      const notifyTitle = `Aviso: ${parsed.data.title}`;
      const notifyDescription = className
        ? `${className} · ${parsed.data.description}`
        : parsed.data.description;

      for (const profile_id of profileIds) {
        const { error: notifyError } = await supabase.rpc("notify_profile", {
          p_profile_id: profile_id,
          p_title: notifyTitle,
          p_description: notifyDescription,
        });

        if (notifyError) {
          return { error: notifyError.message };
        }
      }
    }

    revalidatePath("/announcements");
    revalidatePath("/notifications");
    revalidatePath("/menu");
    revalidatePath("/home");
    revalidatePath("/", "layout");
    return { success: "Aviso publicado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar avisos." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível publicar o aviso.",
    };
  }
}

export async function updateAnnouncement(
  _prevState: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  try {
    const actor = await assertCapability("manage_announcements");

    const parsed = updateAnnouncementSchema.safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      description: formData.get("description"),
      class_id: formData.get("class_id") ?? "",
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase
      .from("announcements")
      .select("id")
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!existing) return { error: "Aviso não encontrado." };

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

    const { error: updateError } = await supabase
      .from("announcements")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
        class_id: parsed.data.class_id,
      })
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id);

    if (updateError) return { error: updateError.message };

    revalidatePath("/announcements");
    revalidatePath("/notifications");
    revalidatePath("/menu");
    revalidatePath("/home");
    revalidatePath("/", "layout");
    return { success: "Aviso atualizado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para editar avisos." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o aviso.",
    };
  }
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<AnnouncementActionState> {
  try {
    const actor = await assertCapability("manage_announcements");
    if (!announcementId) return { error: "Aviso inválido." };

    const supabase = await createClient();
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId)
      .eq("academy_id", actor.academy_id);

    if (error) return { error: error.message };

    revalidatePath("/announcements");
    revalidatePath("/notifications");
    revalidatePath("/menu");
    revalidatePath("/home");
    revalidatePath("/", "layout");
    return { success: "Aviso removido." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para apagar avisos." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível apagar o aviso.",
    };
  }
}
