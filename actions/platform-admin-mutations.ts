"use server";

import { revalidatePath } from "next/cache";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { requirePlatformAdmin } from "@/lib/platform-admin/require";
import type { PlatformAdminActionState } from "@/lib/platform-admin/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemberStatus } from "@/types/domain";
import { updateAcademySchema } from "@/lib/validations/academy";

export type { PlatformAdminActionState } from "@/lib/platform-admin/types";

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

export async function updatePlatformAcademy(
  _prev: PlatformAdminActionState,
  formData: FormData,
): Promise<PlatformAdminActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const academyId = String(formData.get("academyId") ?? "");
  if (!academyId) return { error: "Academia inválida." };

  const parsed = updateAcademySchema.safeParse({
    name: formData.get("name"),
    phone: formOptional(formData, "phone"),
    email: formOptional(formData, "email"),
    instagram: formOptional(formData, "instagram"),
    city: formOptional(formData, "city"),
    state: formOptional(formData, "state"),
    address: formOptional(formData, "address"),
    description: formOptional(formData, "description"),
    timezone: formOptional(formData, "timezone"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("academies")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      instagram: parsed.data.instagram ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      address: parsed.data.address ?? null,
      description: parsed.data.description ?? null,
      timezone: parsed.data.timezone ?? "America/Sao_Paulo",
      updated_at: new Date().toISOString(),
    })
    .eq("id", academyId);

  if (error) {
    return { error: error.message || "Não foi possível salvar." };
  }

  revalidatePath("/admin/academies");
  revalidatePath(`/admin/academies/${academyId}`);
  return { success: "Academia atualizada." };
}

export async function setAcademySuspended(
  _prev: PlatformAdminActionState,
  formData: FormData,
): Promise<PlatformAdminActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const academyId = String(formData.get("academyId") ?? "");
  const suspend = String(formData.get("suspend") ?? "") === "true";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!academyId) return { error: "Academia inválida." };
  if (suspend && reason.length < 3) {
    return { error: "Informe o motivo da suspensão (ex.: falta de pagamento)." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("academies")
    .update({
      is_active: !suspend,
      suspension_reason: suspend ? reason : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", academyId);

  if (error) {
    return { error: error.message || "Não foi possível atualizar o status." };
  }

  revalidatePath("/admin/academies");
  revalidatePath(`/admin/academies/${academyId}`);
  return {
    success: suspend
      ? "Academia suspensa. Donos e membros não conseguem usá-la."
      : "Academia reativada.",
  };
}

export async function setMemberStatusAsPlatformAdmin(
  _prev: PlatformAdminActionState,
  formData: FormData,
): Promise<PlatformAdminActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const memberId = String(formData.get("memberId") ?? "");
  const academyId = String(formData.get("academyId") ?? "");
  const status = String(formData.get("status") ?? "") as MemberStatus;

  if (!memberId || !academyId) return { error: "Membro inválido." };
  if (!["active", "inactive", "suspended"].includes(status)) {
    return { error: "Status inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("academy_members")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("academy_id", academyId);

  if (error) {
    return { error: error.message || "Não foi possível atualizar o membro." };
  }

  revalidatePath(`/admin/academies/${academyId}`);
  return { success: "Status do membro atualizado." };
}

export async function revokeCreateAcademyAccess(
  _prev: PlatformAdminActionState,
  formData: FormData,
): Promise<PlatformAdminActionState> {
  try {
    await requirePlatformAdmin();
  } catch {
    return { error: "Sem permissão." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const admin = createAdminClient();
  const { data: profile, error: findError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (findError) {
    return { error: findError.message || "Erro ao buscar perfil." };
  }
  if (!profile) {
    return { error: "Nenhum perfil encontrado com este e-mail." };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      can_create_academy: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    return { error: error.message || "Não foi possível revogar o acesso." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/owner-invites");
  return { success: `Acesso de criação revogado para ${email}.` };
}
