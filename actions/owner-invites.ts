"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { profileCanCreateAcademy } from "@/lib/academy/create-access";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OwnerInviteActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
  whatsappUrl?: string;
  token?: string;
} | null;

export type OwnerInvitePreview = {
  expiresAt: string;
  isValid: boolean;
};

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

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    throw new Error("forbidden");
  }

  return user;
}

export async function getOwnerInvitePreview(
  token: string,
): Promise<OwnerInvitePreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_owner_invite_preview", {
    p_token: token,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    expiresAt: row.expires_at as string,
    isValid: Boolean(row.is_valid),
  };
}

export async function createOwnerInvite(
  _prev: OwnerInviteActionState,
  formData: FormData,
): Promise<OwnerInviteActionState> {
  let user;
  try {
    user = await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão para gerar convites de dono." };
  }

  const expiresInDays = Number(formData.get("expiresInDays") || 7);
  const maxUses = Number(formData.get("maxUses") || 1);

  if (
    !Number.isFinite(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 90 ||
    !Number.isFinite(maxUses) ||
    maxUses < 1 ||
    maxUses > 50
  ) {
    return { error: "Dados do convite inválidos." };
  }

  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const admin = createAdminClient();
  const { error } = await admin.from("owner_invites").insert({
    token,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
    max_uses: maxUses,
  });

  if (error) {
    return { error: error.message || "Não foi possível criar o convite." };
  }

  const origin = await appOrigin();
  const inviteUrl = `${origin}/owner-invite/${token}`;
  const message = `Olá! Você foi convidado para criar sua academia no BJJ Pulse.\n\nAcesse o link:\n${inviteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    success: "Convite de dono criado!",
    inviteUrl,
    whatsappUrl,
    token,
  };
}

/** Platform admin: unlock create-academy on own account without a separate invite. */
export async function grantSelfCreateAcademy(): Promise<OwnerInviteActionState> {
  let user;
  try {
    user = await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ can_create_academy: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: error.message || "Não foi possível liberar." };
  }

  redirect("/create-academy");
}

export async function acceptOwnerInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/owner-invite/${token}`)}`);
  }

  const { error } = await supabase.rpc("accept_owner_invite", {
    p_token: token,
  });

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

  redirect("/create-academy");
}

export async function assertCanAccessCreateAcademyPage(): Promise<boolean> {
  return profileCanCreateAcademy();
}
