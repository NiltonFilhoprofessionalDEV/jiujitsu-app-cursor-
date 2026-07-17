"use server";

import { redirect } from "next/navigation";
import {
  clearActiveAcademyId,
  setActiveAcademyId,
} from "@/lib/academy/context";
import { isPlatformAdminEmail } from "@/lib/platform-admin";
import { defaultAppHomePath } from "@/lib/journey/nav";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/domain";
import { loginSchema, signupSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  error: string;
} | null;

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

async function safeNextPath(formData: FormData): Promise<string | null> {
  const next = formData.get("next");
  if (typeof next !== "string" || !next.startsWith("/")) return null;
  // Only allow internal relative paths (invite flows)
  if (next.startsWith("//") || next.includes("://")) return null;
  if (next.startsWith("/invite/") || next.startsWith("/owner-invite/")) {
    return next;
  }
  return null;
}

async function redirectAfterAuth(
  userId: string,
  nextPath?: string | null,
): Promise<AuthActionState> {
  if (nextPath) {
    redirect(nextPath);
  }

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("academy_members")
    .select("academy_id, role")
    .eq("profile_id", userId)
    .eq("status", "active");

  if (error) {
    return {
      error:
        "Não foi possível carregar suas academias. Tente novamente em instantes.",
    };
  }

  const list = members ?? [];

  if (list.length === 0) {
    await clearActiveAcademyId();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("can_create_academy")
      .eq("id", userId)
      .maybeSingle();

    if (
      profile?.can_create_academy ||
      isPlatformAdminEmail(user?.email)
    ) {
      redirect("/create-academy");
    }
    redirect("/waiting-academy");
  }

  if (list.length === 1) {
    await setActiveAcademyId(list[0].academy_id as string);
    redirect(defaultAppHomePath(list[0].role as MemberRole));
  }

  await clearActiveAcademyId();
  redirect("/select-academy");
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Não foi possível autenticar. Tente novamente." };
  }

  const nextPath = await safeNextPath(formData);
  return await redirectAfterAuth(data.user.id, nextPath);
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const nextPath = await safeNextPath(formData);
  if (!nextPath) {
    return {
      error:
        "Cadastro só é permitido com um link de convite válido da academia.",
    };
  }

  const inviteOk = await isInviteNextValid(nextPath);
  if (!inviteOk) {
    return {
      error: "Este convite é inválido, expirou ou já foi usado.",
    };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstValidationError(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session && data.user) {
    return await redirectAfterAuth(data.user.id, nextPath);
  }

  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

async function isInviteNextValid(nextPath: string): Promise<boolean> {
  const supabase = await createClient();

  if (nextPath.startsWith("/invite/")) {
    const token = nextPath.slice("/invite/".length).split("/")[0]?.trim();
    if (!token) return false;
    const { data, error } = await supabase.rpc("get_invite_preview", {
      p_token: token,
    });
    if (error || !data) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return Boolean(row?.is_valid);
  }

  if (nextPath.startsWith("/owner-invite/")) {
    const token = nextPath.slice("/owner-invite/".length).split("/")[0]?.trim();
    if (!token) return false;
    const { data, error } = await supabase.rpc("get_owner_invite_preview", {
      p_token: token,
    });
    if (error || !data) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return Boolean(row?.is_valid);
  }

  return false;
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearActiveAcademyId();
  redirect("/login");
}
