"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createAnnouncementSchema, updateAnnouncementSchema } from "@/lib/validations/announcements";

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
      profiles!created_by(name)
  `;

  const withReads = await supabase
    .from("announcements")
    .select(`${baseSelect}, announcement_reads(profile_id)`)
    .eq("academy_id", member.academy_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fallback when announcement_reads migration is not applied yet.
  const { data, error } = withReads.error
    ? await supabase
        .from("announcements")
        .select(baseSelect)
        .eq("academy_id", member.academy_id)
        .order("created_at", { ascending: false })
        .limit(50)
    : withReads;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { name: string }
      | { name: string }[]
      | null;
    const author = Array.isArray(profile) ? profile[0] : profile;
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
      is_read: withReads.error ? true : is_read,
    };
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
      notify_members: formData.get("notify_members") ?? undefined,
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { error: insertError } = await supabase.from("announcements").insert({
      academy_id: actor.academy_id,
      title: parsed.data.title,
      description: parsed.data.description,
      created_by: actor.profile_id,
    });

    if (insertError) {
      return { error: insertError.message };
    }

    if (parsed.data.notify_members) {
      const { data: members, error: membersError } = await supabase
        .from("academy_members")
        .select("profile_id")
        .eq("academy_id", actor.academy_id)
        .eq("status", "active");

      if (membersError) {
        return { error: membersError.message };
      }

      const profileIds = [
        ...new Set(
          (members ?? [])
            .map((m) => m.profile_id as string)
            .filter((id) => id !== actor.profile_id),
        ),
      ];

      for (const profile_id of profileIds) {
        const { error: notifyError } = await supabase.rpc("notify_profile", {
          p_profile_id: profile_id,
          p_title: parsed.data.title,
          p_description: parsed.data.description,
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

    const { error: updateError } = await supabase
      .from("announcements")
      .update({
        title: parsed.data.title,
        description: parsed.data.description,
      })
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id);

    if (updateError) return { error: updateError.message };

    revalidatePath("/announcements");
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
