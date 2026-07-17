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
  createMemberByEmailSchema,
  listMembersFilterSchema,
  updateMemberSchema,
  type ListMembersFilter,
} from "@/lib/validations/members";
import type { MemberRole, MemberStatus } from "@/types/domain";

export type MemberActionState = {
  error?: string;
  success?: string;
} | null;

export type AcademyMemberRow = {
  id: string;
  academy_id: string;
  profile_id: string;
  role: MemberRole;
  status: MemberStatus;
  current_belt: string | null;
  current_degree: number;
  joined_at: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  profile: {
    id: string;
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
  profile_id: string;
  role: string;
  status: string;
  current_belt: string | null;
  current_degree: number;
  joined_at: string;
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
  if (!profile) return null;

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
    emergency_contact_name: privateDetails?.emergency_contact_name ?? null,
    emergency_contact_phone: privateDetails?.emergency_contact_phone ?? null,
    medical_notes: privateDetails?.medical_notes ?? null,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      phone: profile.phone,
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
