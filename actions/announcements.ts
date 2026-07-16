"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createAnnouncementSchema } from "@/lib/validations/announcements";

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
  const { data, error } = await supabase
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
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { name: string }
      | { name: string }[]
      | null;
    const author = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      created_at: row.created_at as string,
      created_by_name: author?.name ?? "Equipe",
    };
  });
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

      if (profileIds.length > 0) {
        const { error: notifyError } = await supabase
          .from("notifications")
          .insert(
            profileIds.map((profile_id) => ({
              profile_id,
              title: parsed.data.title,
              description: parsed.data.description,
            })),
          );

        if (notifyError) {
          return { error: notifyError.message };
        }
      }
    }

    revalidatePath("/announcements");
    revalidatePath("/notifications");
    revalidatePath("/home");
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
