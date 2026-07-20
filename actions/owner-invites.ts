"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { profileCanCreateAcademy } from "@/lib/academy/create-access";
import { isValidEmail, normalizeEmail } from "@/lib/email";
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
  expectedEmail: string | null;
};

export type OwnerInviteListItem = {
  id: string;
  expectedEmail: string | null;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  inviteUrl: string;
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
    expectedEmail: (row.expected_email as string | null) ?? null,
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

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const expiresInDays = Number(formData.get("expiresInDays") || 7);

  if (!isValidEmail(email)) {
    return { error: "Informe um e-mail válido para autorizar." };
  }

  if (
    !Number.isFinite(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 90
  ) {
    return { error: "Validade do convite inválida." };
  }

  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const admin = createAdminClient();
  const { error } = await admin.from("owner_invites").insert({
    token,
    created_by: user.id,
    expires_at: expiresAt.toISOString(),
    max_uses: 1,
    expected_email: email,
  });

  if (error) {
    return { error: error.message || "Não foi possível criar o convite." };
  }

  const origin = await appOrigin();
  const inviteUrl = `${origin}/owner-invite/${token}`;
  const message = `Olá! Você foi autorizado a criar sua academia no BJJ Pulse.\n\nUse o e-mail: ${email}\n\nAcesse o link:\n${inviteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  revalidatePath("/admin/owner-invites");
  revalidatePath("/admin");

  return {
    success: `Convite criado para ${email}.`,
    inviteUrl,
    whatsappUrl,
    token,
  };
}

export async function listOwnerInvites(): Promise<OwnerInviteListItem[]> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const origin = await appOrigin();

  const { data, error } = await admin
    .from("owner_invites")
    .select(
      "id, expected_email, expires_at, max_uses, used_count, is_active, created_at, token",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    expectedEmail: (row.expected_email as string | null) ?? null,
    expiresAt: row.expires_at as string,
    maxUses: row.max_uses as number,
    usedCount: row.used_count as number,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    inviteUrl: `${origin}/owner-invite/${row.token as string}`,
  }));
}

export async function revokeOwnerInvite(
  _prev: OwnerInviteActionState,
  formData: FormData,
): Promise<OwnerInviteActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const id = String(formData.get("inviteId") ?? "");
  if (!id) {
    return { error: "Convite inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("owner_invites")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { error: error.message || "Não foi possível revogar o convite." };
  }

  revalidatePath("/admin/owner-invites");
  revalidatePath("/admin");
  return { success: "Convite revogado." };
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
    if (msg.includes("invite_email_mismatch")) {
      return {
        error:
          "Este convite é exclusivo de outro e-mail. Entre com o e-mail autorizado.",
      };
    }
    return { error: "Não foi possível aceitar o convite. Tente novamente." };
  }

  redirect("/create-academy");
}

export async function assertCanAccessCreateAcademyPage(): Promise<boolean> {
  return profileCanCreateAcademy();
}
