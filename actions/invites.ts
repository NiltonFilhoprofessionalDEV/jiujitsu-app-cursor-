"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setActiveAcademyId } from "@/lib/academy/context";
import { assertCapability } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";
import { createInviteSchema } from "@/lib/validations/invites";
import type { MemberRole } from "@/types/domain";

export type InviteActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
  whatsappUrl?: string;
  token?: string;
} | null;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export type InvitePreview = {
  academyName: string;
  role: MemberRole;
  expiresAt: string;
  isValid: boolean;
};

export async function getInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", {
    p_token: token,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    academyName: row.academy_name as string,
    role: row.role as MemberRole,
    expiresAt: row.expires_at as string,
    isValid: Boolean(row.is_valid),
  };
}

export async function createInvite(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  let actor;
  try {
    actor = await assertCapability("manage_members");
  } catch {
    return { error: "Sem permissão para criar convites." };
  }

  const parsed = createInviteSchema.safeParse({
    role: formData.get("role") || "student",
    expiresInDays: formData.get("expiresInDays") || 7,
    maxUses: formData.get("maxUses") || 100,
  });

  if (!parsed.success) {
    return { error: "Dados do convite inválidos." };
  }

  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

  const supabase = await createClient();

  const { data: academy, error: academyError } = await supabase
    .from("academies")
    .select("name")
    .eq("id", actor.academy_id)
    .maybeSingle();

  if (academyError || !academy?.name) {
    return { error: "Não foi possível carregar o nome da academia." };
  }

  const { error } = await supabase.from("academy_invites").insert({
    academy_id: actor.academy_id,
    token,
    role: parsed.data.role,
    created_by: actor.profile_id,
    expires_at: expiresAt.toISOString(),
    max_uses: parsed.data.maxUses,
  });

  if (error) {
    return { error: error.message || "Não foi possível criar o convite." };
  }

  const origin = await appOrigin();
  const inviteUrl = `${origin}/invite/${token}`;
  const message = `Olá! Você foi convidado para entrar na academia "${academy.name}" no app BJJ Manager.\n\nAcesse o link para se cadastrar:\n${inviteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    success: "Convite criado! Compartilhe no WhatsApp.",
    inviteUrl,
    whatsappUrl,
    token,
  };
}

export async function listInvites() {
  const actor = await assertCapability("manage_members");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_invites")
    .select(
      "id, token, role, expires_at, max_uses, used_count, is_active, created_at",
    )
    .eq("academy_id", actor.academy_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function deactivateInvite(inviteId: string) {
  const actor = await assertCapability("manage_members");
  const supabase = await createClient();
  const { error } = await supabase
    .from("academy_invites")
    .update({ is_active: false })
    .eq("id", inviteId)
    .eq("academy_id", actor.academy_id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { data: academyId, error } = await supabase.rpc(
    "accept_academy_invite",
    { p_token: token },
  );

  if (error) {
    const msg = error.message || "";
    if (msg.includes("invite_expired")) {
      return { error: "Este convite expirou." };
    }
    if (msg.includes("invite_inactive") || msg.includes("invite_exhausted")) {
      return { error: "Este convite não está mais disponível." };
    }
    if (msg.includes("invite_not_found")) {
      return { error: "Convite inválido." };
    }
    return { error: "Não foi possível aceitar o convite. Tente novamente." };
  }

  if (!academyId || typeof academyId !== "string") {
    return { error: "Resposta inválida ao aceitar convite." };
  }

  await setActiveAcademyId(academyId);
  redirect("/home");
}
