"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validations/auth";
import {
  updateEmergencyContactSchema,
  updatePersonalProfileSchema,
} from "@/lib/validations/profile";

export type ProfileActionState = {
  error?: string;
  success?: string;
} | null;

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function revalidateProfileSurfaces() {
  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/menu");
  revalidatePath("/journey");
  revalidatePath("/", "layout");
}

export async function uploadAvatar(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione uma imagem." };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Use uma imagem JPEG, PNG ou WebP." };
  }

  if (file.size > MAX_BYTES) {
    return { error: "A imagem deve ter no máximo 2 MB." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faça login novamente para alterar a foto." };
  }

  const path = `${user.id}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      error: "Não foi possível enviar a foto. Tente novamente.",
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      error: "A foto foi enviada, mas não conseguimos salvar no perfil.",
    };
  }

  revalidateProfileSurfaces();
  revalidatePath("/checkin");
  revalidatePath("/classes");
  revalidatePath("/members");

  return { success: "Foto atualizada." };
}

export async function updatePersonalProfile(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = updatePersonalProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    birth_date: formData.get("birth_date") ?? "",
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  try {
    const member = await getActiveMembership();
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        name: parsed.data.name,
        phone: parsed.data.phone,
        birth_date: parsed.data.birth_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", member.profile_id);

    if (error) return { error: error.message };

    revalidateProfileSurfaces();
    return { success: "Dados atualizados." };
  } catch {
    return { error: "Não foi possível salvar seus dados." };
  }
}

export async function updateEmergencyContact(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = updateEmergencyContactSchema.safeParse({
    emergency_contact_name: formData.get("emergency_contact_name") ?? "",
    emergency_contact_phone: formData.get("emergency_contact_phone") ?? "",
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  try {
    const member = await getActiveMembership();
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("member_private_details")
      .select("member_id")
      .eq("member_id", member.id)
      .maybeSingle();

    const payload = {
      emergency_contact_name: parsed.data.emergency_contact_name,
      emergency_contact_phone: parsed.data.emergency_contact_phone,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("member_private_details")
        .update(payload)
        .eq("member_id", member.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("member_private_details").insert({
        member_id: member.id,
        ...payload,
      });
      if (error) return { error: error.message };
    }

    revalidatePath("/profile");
    return { success: "Contato de emergência salvo." };
  } catch {
    return { error: "Não foi possível salvar o contato de emergência." };
  }
}

export async function changePassword(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Faça login novamente para alterar a senha." };
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (reauthError) {
    return { error: "Senha atual incorreta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return {
      error: "Não foi possível atualizar a senha. Tente novamente.",
    };
  }

  return { success: "Senha atualizada com sucesso." };
}
