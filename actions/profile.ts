"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validations/auth";

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

  revalidatePath("/profile");
  revalidatePath("/home");
  revalidatePath("/menu");
  revalidatePath("/checkin");
  revalidatePath("/classes");
  revalidatePath("/stats");
  revalidatePath("/members");
  revalidatePath("/graduations");
  revalidatePath("/announcements");
  revalidatePath("/notifications");
  revalidatePath("/academy");

  return { success: "Foto atualizada." };
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
