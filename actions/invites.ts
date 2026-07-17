"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendInviteEmail } from "@/lib/email/send-invite";
import {
  buildAcademyInviteMessage,
  buildInviteMailto,
} from "@/lib/invites/message";
import { setActiveAcademyId } from "@/lib/academy/context";
import { defaultAppHomePath } from "@/lib/journey/nav";
import { assertCapability } from "@/lib/permissions/assert";
import {
  toWhatsAppE164,
  whatsappChatUrl,
  whatsappShareUrl,
} from "@/lib/phone/whatsapp";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/domain";

export type InviteActionState = {
  error?: string;
  success?: string;
  inviteUrl?: string;
  whatsappUrl?: string;
  mailtoUrl?: string;
  emailSent?: boolean;
  token?: string;
} | null;

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function appOrigin(): Promise<string> {
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
  inviteeName: string | null;
  expectedEmail: string | null;
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
    inviteeName: (row.invitee_name as string | null) ?? null,
    expectedEmail: (row.expected_email as string | null) ?? null,
  };
}

export type PersonalInviteLinks = {
  token: string;
  inviteUrl: string;
  whatsappUrl: string;
  mailtoUrl: string | null;
  emailSent: boolean;
};

/** Creates a 1-use invite linked to an existing academy member. */
export async function createPersonalInviteForMember(input: {
  memberId: string;
  academyId: string;
  createdByProfileId: string;
  role: MemberRole;
  academyName: string;
  inviteeName: string;
  phone?: string | null;
  email?: string | null;
  sendEmail?: boolean;
  expiresInDays?: number;
}): Promise<{ error?: string; links?: PersonalInviteLinks }> {
  if (input.role === "owner" || input.role === "administrator") {
    return { error: "Convite pessoal não permite este papel." };
  }

  const token = randomToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 14));

  const supabase = await createClient();

  // Deactivate previous personal invites for this member
  await supabase
    .from("academy_invites")
    .update({ is_active: false })
    .eq("academy_id", input.academyId)
    .eq("target_member_id", input.memberId)
    .eq("is_active", true);

  const { error } = await supabase.from("academy_invites").insert({
    academy_id: input.academyId,
    token,
    role: input.role,
    created_by: input.createdByProfileId,
    expires_at: expiresAt.toISOString(),
    max_uses: 1,
    target_member_id: input.memberId,
  });

  if (error) {
    return { error: error.message || "Não foi possível criar o convite." };
  }

  const origin = await appOrigin();
  const inviteUrl = `${origin}/invite/${token}`;
  const message = buildAcademyInviteMessage({
    academyName: input.academyName,
    inviteUrl,
    inviteeName: input.inviteeName,
  });

  const directed =
    input.phone && toWhatsAppE164(input.phone)
      ? whatsappChatUrl(input.phone, message)
      : null;
  const whatsappUrl = directed ?? whatsappShareUrl(message);

  let emailSent = false;
  let mailtoUrl: string | null = null;

  if (input.email) {
    mailtoUrl = buildInviteMailto({
      email: input.email,
      academyName: input.academyName,
      inviteUrl,
      inviteeName: input.inviteeName,
    });

    if (input.sendEmail) {
      try {
        const result = await sendInviteEmail({
          to: input.email,
          academyName: input.academyName,
          inviteUrl,
          inviteeName: input.inviteeName,
        });
        emailSent = result.ok;
      } catch {
        emailSent = false;
      }
    }
  }

  return {
    links: {
      token,
      inviteUrl,
      whatsappUrl,
      mailtoUrl,
      emailSent,
    },
  };
}

export async function resendMemberInvite(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  let actor;
  try {
    actor = await assertCapability("manage_members");
  } catch {
    return { error: "Sem permissão para reenviar convite." };
  }

  const memberId = String(formData.get("member_id") ?? "");
  const sendEmail = formData.get("send_email") === "on";

  if (!memberId) {
    return { error: "Membro inválido." };
  }

  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("academy_members")
    .select(
      "id, role, profile_id, pending_name, pending_email, pending_phone, profiles(name, email, phone)",
    )
    .eq("id", memberId)
    .eq("academy_id", actor.academy_id)
    .maybeSingle();

  if (error || !member) {
    return { error: "Membro não encontrado." };
  }

  if (member.profile_id) {
    return { error: "Este membro já tem acesso ao app." };
  }

  const { data: academy } = await supabase
    .from("academies")
    .select("name")
    .eq("id", actor.academy_id)
    .maybeSingle();

  if (!academy?.name) {
    return { error: "Academia não encontrada." };
  }

  const profileRel = member.profiles as
    | { name: string; email: string; phone: string | null }
    | { name: string; email: string; phone: string | null }[]
    | null;
  const profile = Array.isArray(profileRel) ? profileRel[0] : profileRel;

  const inviteeName =
    (member.pending_name as string | null) ?? profile?.name ?? "Aluno";
  const phone =
    (member.pending_phone as string | null) ?? profile?.phone ?? null;
  const email =
    (member.pending_email as string | null) ?? profile?.email ?? null;

  const created = await createPersonalInviteForMember({
    memberId: member.id as string,
    academyId: actor.academy_id,
    createdByProfileId: actor.profile_id,
    role: member.role as MemberRole,
    academyName: academy.name,
    inviteeName,
    phone,
    email,
    sendEmail,
  });

  if (created.error || !created.links) {
    return { error: created.error ?? "Falha ao criar convite." };
  }

  return {
    success: created.links.emailSent
      ? "Convite recriado e e-mail enviado."
      : "Convite recriado. Compartilhe no WhatsApp ou e-mail.",
    inviteUrl: created.links.inviteUrl,
    whatsappUrl: created.links.whatsappUrl,
    mailtoUrl: created.links.mailtoUrl ?? undefined,
    emailSent: created.links.emailSent,
    token: created.links.token,
  };
}

export async function listInvites() {
  const actor = await assertCapability("manage_members");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_invites")
    .select(
      "id, token, role, expires_at, max_uses, used_count, is_active, created_at, target_member_id",
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
    if (msg.includes("invite_already_claimed")) {
      return { error: "Este convite já foi usado por outra pessoa." };
    }
    if (msg.includes("invite_email_mismatch")) {
      return {
        error:
          "Este convite é só para o e-mail cadastrado pelo professor. Entre com esse e-mail ou peça um novo convite.",
      };
    }
    return { error: "Não foi possível aceitar o convite. Tente novamente." };
  }

  if (!academyId || typeof academyId !== "string") {
    return { error: "Resposta inválida ao aceitar convite." };
  }

  await setActiveAcademyId(academyId);
  const supabaseRole = await createClient();
  const {
    data: { user: currentUser },
  } = await supabaseRole.auth.getUser();
  if (currentUser) {
    const { data: member } = await supabaseRole
      .from("academy_members")
      .select("role")
      .eq("profile_id", currentUser.id)
      .eq("academy_id", academyId)
      .eq("status", "active")
      .maybeSingle();
    if (member?.role) {
      redirect(defaultAppHomePath(member.role as MemberRole));
    }
  }
  redirect("/home");
}
