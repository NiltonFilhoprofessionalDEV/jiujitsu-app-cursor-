"use server";

import { redirect } from "next/navigation";
import { setActiveAcademyId } from "@/lib/academy/context";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";

export type AuthActionState = {
  error: string;
} | null;

function firstValidationError(error: {
  flatten: () => { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
}): string {
  const flat = error.flatten();
  const fieldMessage = Object.values(flat.fieldErrors).flat().find(Boolean);
  return fieldMessage ?? flat.formErrors[0] ?? "Dados inválidos";
}

async function redirectAfterAuth(userId: string) {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("academy_members")
    .select("academy_id")
    .eq("profile_id", userId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const list = members ?? [];

  if (list.length === 0) {
    redirect("/create-academy");
  }

  if (list.length === 1) {
    await setActiveAcademyId(list[0].academy_id as string);
    redirect("/home");
  }

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

  await redirectAfterAuth(data.user.id);
  return null;
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
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
    await redirectAfterAuth(data.user.id);
  }

  redirect("/login");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
