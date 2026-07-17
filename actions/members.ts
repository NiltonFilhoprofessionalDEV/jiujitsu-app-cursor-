"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createManualMemberSchema,
  createMemberByEmailSchema,
  deleteMemberSchema,
  listMembersFilterSchema,
  updateMemberSchema,
  type ListMembersFilter,
} from "@/lib/validations/members";
import { createPersonalInviteForMember } from "@/actions/invites";
import { toWhatsAppE164 } from "@/lib/phone/whatsapp";
import type { MemberRole, MemberStatus } from "@/types/domain";

export type MemberActionState = {
  error?: string;
  success?: string;
  memberId?: string;
  inviteUrl?: string;
  whatsappUrl?: string;
  mailtoUrl?: string;
  emailSent?: boolean;
} | null;

export type AcademyMemberRow = {
  id: string;
  academy_id: string;
  profile_id: string | null;
  role: MemberRole;
  status: MemberStatus;
  current_belt: string | null;
  current_degree: number;
  joined_at: string;
  has_app_access: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  profile: {
    id: string | null;
    name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
  };
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

function formOptional(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Roles the actor is allowed to assign (create or update). */
function allowedAssignableRoles(actorRole: MemberRole): MemberRole[] {
  if (actorRole === "owner") {
    return [
      "owner",
      "administrator",
      "instructor",
      "assistant_instructor",
      "student",
      "guardian",
    ];
  }
  if (actorRole === "administrator") {
    return [
      "administrator",
      "instructor",
      "assistant_instructor",
      "student",
      "guardian",
    ];
  }
  if (actorRole === "instructor") {
    return ["assistant_instructor", "student", "guardian", "instructor"];
  }
  return [];
}

function assertCanAssignRole(
  actorRole: MemberRole,
  targetRole: MemberRole,
): string | null {
  if (targetRole === "owner" && actorRole !== "owner") {
    return "Apenas o proprietário pode definir o papel Owner.";
  }
  if (
    actorRole === "instructor" &&
    (targetRole === "owner" || targetRole === "administrator")
  ) {
    return "Instrutor não pode promover a Owner ou Administrador.";
  }
  if (!allowedAssignableRoles(actorRole).includes(targetRole)) {
    return "Você não tem permissão para atribuir este papel.";
  }
  return null;
}

function mapMemberRow(row: {
  id: string;
  academy_id: string;
  profile_id: string | null;
  role: string;
  status: string;
  current_belt: string | null;
  current_degree: number;
  joined_at: string;
  pending_name?: string | null;
  pending_email?: string | null;
  pending_phone?: string | null;
  member_private_details?:
    | {
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        medical_notes: string | null;
      }
    | {
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        medical_notes: string | null;
      }[]
    | null;
  profiles:
    | {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
      }
    | {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        phone: string | null;
      }[]
    | null;
}): AcademyMemberRow | null {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const pendingName = row.pending_name?.trim() || null;
  const pendingEmail = row.pending_email?.trim() || null;
  const pendingPhone = row.pending_phone?.trim() || null;

  if (!profile && !pendingName) return null;

  const privateRel = row.member_private_details;
  const privateDetails = Array.isArray(privateRel)
    ? privateRel[0]
    : privateRel;

  return {
    id: row.id,
    academy_id: row.academy_id,
    profile_id: row.profile_id,
    role: row.role as MemberRole,
    status: row.status as MemberStatus,
    current_belt: row.current_belt,
    current_degree: row.current_degree,
    joined_at: row.joined_at,
    has_app_access: Boolean(row.profile_id),
    emergency_contact_name: privateDetails?.emergency_contact_name ?? null,
    emergency_contact_phone: privateDetails?.emergency_contact_phone ?? null,
    medical_notes: privateDetails?.medical_notes ?? null,
    profile: {
      id: profile?.id ?? null,
      name: profile?.name ?? pendingName ?? "Sem nome",
      email: profile?.email ?? pendingEmail ?? "",
      avatar_url: profile?.avatar_url ?? null,
      phone: profile?.phone ?? pendingPhone ?? null,
    },
  };
}

const MEMBER_SELECT = `
  id,
  academy_id,
  profile_id,
  role,
  status,
  current_belt,
  current_degree,
  joined_at,
  pending_name,
  pending_email,
  pending_phone,
  member_private_details(
    emergency_contact_name,
    emergency_contact_phone,
    medical_notes
  ),
  profiles(id, name, email, avatar_url, phone)
`;

async function upsertPrivateDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  details: {
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    medical_notes?: string | null;
  },
): Promise<string | null> {
  const hasAny =
    details.emergency_contact_name !== undefined ||
    details.emergency_contact_phone !== undefined ||
    details.medical_notes !== undefined;

  if (!hasAny) return null;

  const { data: existing } = await supabase
    .from("member_private_details")
    .select("member_id")
    .eq("member_id", memberId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (details.emergency_contact_name !== undefined) {
    payload.emergency_contact_name = details.emergency_contact_name ?? null;
  }
  if (details.emergency_contact_phone !== undefined) {
    payload.emergency_contact_phone = details.emergency_contact_phone ?? null;
  }
  if (details.medical_notes !== undefined) {
    payload.medical_notes = details.medical_notes ?? null;
  }

  if (existing) {
    const { error } = await supabase
      .from("member_private_details")
      .update(payload)
      .eq("member_id", memberId);
    return error?.message ?? null;
  }

  const { error } = await supabase.from("member_private_details").insert({
    member_id: memberId,
    emergency_contact_name: details.emergency_contact_name ?? null,
    emergency_contact_phone: details.emergency_contact_phone ?? null,
    medical_notes: details.medical_notes ?? null,
  });
  return error?.message ?? null;
}

export async function listMembers(
  filters: Record<string, string | undefined> = {},
): Promise<AcademyMemberRow[]> {
  const member = await getActiveMembership();
  if (
    !can(member.role, "view_members") &&
    !can(member.role, "manage_members")
  ) {
    throw new PermissionError(member.role, "view_members");
  }

  const parsed = listMembersFilterSchema.safeParse(filters);
  const filter: Partial<ListMembersFilter> = parsed.success ? parsed.data : {};

  const supabase = await createClient();
  let query = supabase
    .from("academy_members")
    .select(MEMBER_SELECT)
    .eq("academy_id", member.academy_id)
    .order("joined_at", { ascending: false });

  if (filter.role) {
    query = query.eq("role", filter.role);
  }
  if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.belt) {
    query = query.eq("current_belt", filter.belt);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  let rows = (data ?? []).flatMap((row) => {
    const mapped = mapMemberRow(row as Parameters<typeof mapMemberRow>[0]);
    return mapped ? [mapped] : [];
  });

  const needle = filter.q?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter((row) => {
      const haystack = [
        row.profile.name,
        row.profile.email,
        row.profile.phone ?? "",
        row.emergency_contact_phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  return rows;
}

export async function getMember(
  memberId: string,
): Promise<AcademyMemberRow | null> {
  const actor = await getActiveMembership();
  if (
    !can(actor.role, "view_members") &&
    !can(actor.role, "manage_members")
  ) {
    throw new PermissionError(actor.role, "view_members");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_members")
    .select(MEMBER_SELECT)
    .eq("id", memberId)
    .eq("academy_id", actor.academy_id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;
  return mapMemberRow(data as Parameters<typeof mapMemberRow>[0]);
}

export async function createManualMember(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  let actor;
  try {
    actor = await assertCapability("manage_members");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar membros." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível criar o membro.",
    };
  }

  const parsed = createManualMemberSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formOptional(formData, "email"),
    role: formData.get("role") || "student",
    status: formData.get("status") || "active",
    current_belt: formOptional(formData, "current_belt"),
    current_degree: formOptional(formData, "current_degree") || "0",
    emergency_contact_name: formOptional(formData, "emergency_contact_name"),
    emergency_contact_phone: formOptional(formData, "emergency_contact_phone"),
    medical_notes: formOptional(formData, "medical_notes"),
    send_email: formOptional(formData, "send_email"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const roleError = assertCanAssignRole(actor.role, parsed.data.role);
  if (roleError) {
    return { error: roleError };
  }

  if (!toWhatsAppE164(parsed.data.phone)) {
    return {
      error:
        "WhatsApp inválido. Use DDD + número (ex.: 11999998888).",
    };
  }

  const supabase = await createClient();

  const { data: academy, error: academyError } = await supabase
    .from("academies")
    .select("name")
    .eq("id", actor.academy_id)
    .maybeSingle();

  if (academyError || !academy?.name) {
    return { error: "Não foi possível carregar a academia." };
  }

  // If email matches an existing profile, link directly (no pending)
  if (parsed.data.email) {
    try {
      const admin = createAdminClient();
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, email, name")
        .ilike("email", parsed.data.email)
        .maybeSingle();

      if (existingProfile) {
        const { data: already } = await supabase
          .from("academy_members")
          .select("id")
          .eq("academy_id", actor.academy_id)
          .eq("profile_id", existingProfile.id)
          .maybeSingle();

        if (already) {
          return { error: "Esta pessoa já é membro desta academia." };
        }

        const { data: inserted, error: insertError } = await supabase
          .from("academy_members")
          .insert({
            academy_id: actor.academy_id,
            profile_id: existingProfile.id,
            role: parsed.data.role,
            status: parsed.data.status,
            current_belt: parsed.data.current_belt ?? null,
            current_degree: parsed.data.current_degree ?? 0,
          })
          .select("id")
          .single();

        if (insertError || !inserted) {
          return {
            error: insertError?.message ?? "Falha ao vincular membro.",
          };
        }

        await upsertPrivateDetails(supabase, inserted.id, {
          emergency_contact_name: parsed.data.emergency_contact_name ?? null,
          emergency_contact_phone: parsed.data.emergency_contact_phone ?? null,
          medical_notes: parsed.data.medical_notes ?? null,
        });

        if (!existingProfile.name && parsed.data.name) {
          await admin
            .from("profiles")
            .update({ phone: parsed.data.phone })
            .eq("id", existingProfile.id);
        } else {
          await admin
            .from("profiles")
            .update({ phone: parsed.data.phone })
            .eq("id", existingProfile.id);
        }

        revalidatePath("/members");
        return {
          success: "Membro vinculado (conta já existia). Acesso liberado.",
          memberId: inserted.id,
        };
      }
    } catch {
      // Fall through to pending create if admin lookup fails
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("academy_members")
    .insert({
      academy_id: actor.academy_id,
      profile_id: null,
      role: parsed.data.role,
      status: parsed.data.status,
      current_belt: parsed.data.current_belt ?? null,
      current_degree: parsed.data.current_degree ?? 0,
      pending_name: parsed.data.name,
      pending_email: parsed.data.email ?? null,
      pending_phone: parsed.data.phone,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      error: insertError?.message ?? "Não foi possível criar o aluno.",
    };
  }

  const privateError = await upsertPrivateDetails(supabase, inserted.id, {
    emergency_contact_name: parsed.data.emergency_contact_name ?? null,
    emergency_contact_phone: parsed.data.emergency_contact_phone ?? null,
    medical_notes: parsed.data.medical_notes ?? null,
  });

  if (privateError) {
    return { error: privateError };
  }

  const invite = await createPersonalInviteForMember({
    memberId: inserted.id,
    academyId: actor.academy_id,
    createdByProfileId: actor.profile_id,
    role: parsed.data.role,
    academyName: academy.name,
    inviteeName: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    sendEmail: Boolean(parsed.data.send_email && parsed.data.email),
  });

  if (invite.error || !invite.links) {
    revalidatePath("/members");
    revalidatePath(`/members/${inserted.id}`);
    return {
      success:
        "Aluno criado. Abra o perfil para gerar o convite de acesso.",
      memberId: inserted.id,
    };
  }

  revalidatePath("/members");
  revalidatePath(`/members/${inserted.id}`);

  return {
    success: invite.links.emailSent
      ? "Aluno criado e e-mail de convite enviado."
      : "Aluno criado! Envie o convite pelo WhatsApp.",
    memberId: inserted.id,
    inviteUrl: invite.links.inviteUrl,
    whatsappUrl: invite.links.whatsappUrl,
    mailtoUrl: invite.links.mailtoUrl ?? undefined,
    emailSent: invite.links.emailSent,
  };
}

export async function createMemberByEmail(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  let actor;
  try {
    actor = await assertCapability("manage_members");
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar membros." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível vincular o membro.",
    };
  }

  const parsed = createMemberByEmailSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") || "student",
    status: formData.get("status") || "active",
    current_belt: formOptional(formData, "current_belt"),
    current_degree: formOptional(formData, "current_degree") || "0",
    emergency_contact_name: formOptional(formData, "emergency_contact_name"),
    emergency_contact_phone: formOptional(formData, "emergency_contact_phone"),
    medical_notes: formOptional(formData, "medical_notes"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const roleError = assertCanAssignRole(actor.role, parsed.data.role);
  if (roleError) {
    return { error: roleError };
  }

  let profile: { id: string; email: string; name: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, name")
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }
    profile = data;
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível buscar o perfil pelo e-mail.",
    };
  }

  if (!profile) {
    return {
      error:
        "Nenhuma conta encontrada com este e-mail. Peça para a pessoa criar uma conta (signup) antes de vinculá-la à academia.",
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("academy_members")
    .select("id")
    .eq("academy_id", actor.academy_id)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existing) {
    return { error: "Esta pessoa já é membro desta academia." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("academy_members")
    .insert({
      academy_id: actor.academy_id,
      profile_id: profile.id,
      role: parsed.data.role,
      status: parsed.data.status,
      current_belt: parsed.data.current_belt ?? null,
      current_degree: parsed.data.current_degree ?? 0,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  const privateError = await upsertPrivateDetails(supabase, inserted.id, {
    emergency_contact_name: parsed.data.emergency_contact_name ?? null,
    emergency_contact_phone: parsed.data.emergency_contact_phone ?? null,
    medical_notes: parsed.data.medical_notes ?? null,
  });

  if (privateError) {
    return { error: privateError };
  }

  revalidatePath("/members");
  redirect("/members");
}

export async function updateMember(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  try {
    const actor = await assertCapability("manage_members");

    const parsed = updateMemberSchema.safeParse({
      id: formData.get("id"),
      role: formData.get("role") || undefined,
      status: formData.get("status") || undefined,
      current_belt: formOptional(formData, "current_belt"),
      current_degree: formOptional(formData, "current_degree") || undefined,
      emergency_contact_name: formOptional(formData, "emergency_contact_name"),
      emergency_contact_phone: formOptional(formData, "emergency_contact_phone"),
      medical_notes: formOptional(formData, "medical_notes"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: target, error: fetchError } = await supabase
      .from("academy_members")
      .select("id, role, profile_id")
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!target) {
      return { error: "Membro não encontrado." };
    }

    if (parsed.data.role !== undefined) {
      const roleError = assertCanAssignRole(actor.role, parsed.data.role);
      if (roleError) {
        return { error: roleError };
      }
      // Demoting/changing another owner: only owner
      if (target.role === "owner" && actor.role !== "owner") {
        return { error: "Apenas o proprietário pode alterar o papel de um Owner." };
      }
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.role !== undefined) payload.role = parsed.data.role;
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
    if (parsed.data.current_belt !== undefined) {
      payload.current_belt = parsed.data.current_belt;
    }
    if (parsed.data.current_degree !== undefined) {
      payload.current_degree = parsed.data.current_degree;
    }

    const { error: updateError } = await supabase
      .from("academy_members")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id);

    if (updateError) {
      return { error: updateError.message };
    }

    const privateError = await upsertPrivateDetails(supabase, parsed.data.id, {
      emergency_contact_name: parsed.data.emergency_contact_name,
      emergency_contact_phone: parsed.data.emergency_contact_phone,
      medical_notes: parsed.data.medical_notes,
    });

    if (privateError) {
      return { error: privateError };
    }

    revalidatePath("/members");
    revalidatePath(`/members/${parsed.data.id}`);
    return { success: "Membro atualizado com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar membros." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o membro.",
    };
  }
}

export async function deleteMember(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  try {
    const actor = await assertCapability("manage_members");

    const parsed = deleteMemberSchema.safeParse({
      id: formData.get("id"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    if (parsed.data.id === actor.id) {
      return { error: "Você não pode apagar a si mesmo." };
    }

    const supabase = await createClient();
    const { data: target, error: fetchError } = await supabase
      .from("academy_members")
      .select("id, role, profile_id, pending_name")
      .eq("id", parsed.data.id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (fetchError) {
      return { error: fetchError.message };
    }
    if (!target) {
      return { error: "Membro não encontrado." };
    }

    if (target.role === "owner" && actor.role !== "owner") {
      return { error: "Apenas o proprietário pode apagar um Owner." };
    }

    if (
      actor.role === "instructor" &&
      (target.role === "owner" || target.role === "administrator")
    ) {
      return { error: "Instrutor não pode apagar Owner ou Administrador." };
    }

    if (target.role === "owner") {
      const { count } = await supabase
        .from("academy_members")
        .select("id", { count: "exact", head: true })
        .eq("academy_id", actor.academy_id)
        .eq("role", "owner")
        .eq("status", "active");

      if ((count ?? 0) <= 1) {
        return {
          error: "Não é possível apagar o único proprietário da academia.",
        };
      }
    }

    // Deactivate personal invites first
    await supabase
      .from("academy_invites")
      .update({ is_active: false })
      .eq("academy_id", actor.academy_id)
      .eq("target_member_id", target.id);

    // Prefer hard delete when possible (pending / no history).
    // If FKs block (attendance etc.), soft-delete to inactive.
    const { error: deleteError } = await supabase
      .from("academy_members")
      .delete()
      .eq("id", target.id)
      .eq("academy_id", actor.academy_id);

    if (deleteError) {
      const { error: softError } = await supabase
        .from("academy_members")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.id)
        .eq("academy_id", actor.academy_id);

      if (softError) {
        return { error: softError.message };
      }

      revalidatePath("/members");
      revalidatePath(`/members/${target.id}`);
      return {
        success:
          "Membro removido da lista ativa (histórico de presenças mantido).",
      };
    }

    revalidatePath("/members");
    return { success: "Membro apagado." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para gerenciar membros." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível apagar o membro.",
    };
  }
}
