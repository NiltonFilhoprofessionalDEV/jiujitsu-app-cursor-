"use server";

import { revalidatePath } from "next/cache";
import {
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionState = {
  error?: string;
  success?: string;
} | null;

export type NotificationRow = {
  id: string;
  title: string;
  description: string;
  is_read: boolean;
  created_at: string;
};

export async function listNotifications(): Promise<NotificationRow[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, description, is_read, created_at")
    .eq("profile_id", member.profile_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    is_read: Boolean(row.is_read),
    created_at: row.created_at as string,
  }));
}

export async function countUnreadNotifications(): Promise<number> {
  const member = await getActiveMembership();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", member.profile_id)
    .eq("is_read", false);

  if (error) {
    throw error;
  }
  return count ?? 0;
}

export async function markNotificationRead(
  _prevState: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const member = await getActiveMembership();
    const id = formData.get("id");
    if (typeof id !== "string" || !id) {
      return { error: "Notificação inválida." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("profile_id", member.profile_id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/home");
    return { success: "Marcada como lida." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar a notificação.",
    };
  }
}

export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  try {
    const member = await getActiveMembership();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", member.profile_id)
      .eq("is_read", false);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/notifications");
    revalidatePath("/home");
    return { success: "Todas marcadas como lidas." };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar as notificações.",
    };
  }
}
