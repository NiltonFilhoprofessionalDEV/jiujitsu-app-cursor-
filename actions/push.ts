"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/permissions/assert";
import { getVapidPublicKey } from "@/lib/push/web-push";
import { createClient } from "@/lib/supabase/server";

export type PushActionState = {
  error?: string;
  success?: string;
  enabled?: boolean;
} | null;

export async function getPushReminderStatus(): Promise<{
  configured: boolean;
  publicKey: string | null;
  subscribed: boolean;
}> {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return { configured: false, publicKey: null, subscribed: false };
  }

  try {
    const member = await getActiveMembership();
    const supabase = await createClient();
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", member.profile_id);

    return {
      configured: true,
      publicKey,
      subscribed: (count ?? 0) > 0,
    };
  } catch {
    return { configured: true, publicKey, subscribed: false };
  }
}

export async function savePushSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}): Promise<PushActionState> {
  try {
    const member = await getActiveMembership();
    if (member.role !== "student") {
      return { error: "Lembretes de treino são para alunos." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id: member.profile_id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        user_agent: input.userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,endpoint" },
    );

    if (error) return { error: error.message };

    revalidatePath("/profile");
    return { success: "Lembretes de treino ativados.", enabled: true };
  } catch {
    return { error: "Não foi possível ativar os lembretes." };
  }
}

export async function removePushSubscriptions(): Promise<PushActionState> {
  try {
    const member = await getActiveMembership();
    const supabase = await createClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("profile_id", member.profile_id);

    if (error) return { error: error.message };

    revalidatePath("/profile");
    return { success: "Lembretes desativados.", enabled: false };
  } catch {
    return { error: "Não foi possível desativar os lembretes." };
  }
}
