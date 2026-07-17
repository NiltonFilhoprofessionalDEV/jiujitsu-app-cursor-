"use server";

import { revalidatePath } from "next/cache";
import {
  assertCapability,
  PermissionError,
} from "@/lib/permissions/assert";
import { createClient } from "@/lib/supabase/server";

export type ClassMemberRow = {
  id: string;
  member_id: string;
  member_name: string;
};

export type RosterStudentOption = {
  id: string;
  name: string;
};

export async function listClassMembers(
  classId: string,
): Promise<ClassMemberRow[]> {
  const member = await assertCapability("manage_classes");
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("academy_id", member.academy_id)
    .maybeSingle();

  if (!klass) return [];

  const { data, error } = await supabase
    .from("class_members")
    .select(
      `
      id,
      member_id,
      academy_members!member_id(
        profiles!profile_id(name)
      )
    `,
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const am = row.academy_members as
      | { profiles: { name: string } | { name: string }[] | null }
      | { profiles: { name: string } | { name: string }[] | null }[]
      | null;
    const amObj = Array.isArray(am) ? am[0] : am;
    const profile = amObj?.profiles;
    const author = Array.isArray(profile) ? profile[0] : profile;
    return {
      id: row.id as string,
      member_id: row.member_id as string,
      member_name: author?.name ?? "Membro",
    };
  });
}

export async function listAcademyStudentsForRoster(): Promise<
  RosterStudentOption[]
> {
  const member = await assertCapability("manage_classes");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("academy_members")
    .select(
      `
      id,
      profiles!profile_id(name)
    `,
    )
    .eq("academy_id", member.academy_id)
    .eq("status", "active")
    .in("role", ["student", "guardian"])
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const profile = row.profiles as
      | { name: string }
      | { name: string }[]
      | null;
    const author = Array.isArray(profile) ? profile[0] : profile;
    if (!author?.name) return [];
    return [{ id: row.id as string, name: author.name }];
  });
}

export async function addClassMember(
  classId: string,
  academyMemberId: string,
): Promise<{ error?: string }> {
  try {
    const actor = await assertCapability("manage_classes");
    const supabase = await createClient();

    const { data: klass } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!klass) return { error: "Turma não encontrada." };

    const { data: target } = await supabase
      .from("academy_members")
      .select("id")
      .eq("id", academyMemberId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!target) return { error: "Membro inválido." };

    const { error } = await supabase.from("class_members").insert({
      class_id: classId,
      member_id: academyMemberId,
    });

    if (error) {
      if (error.code === "23505") return { error: "Já está na turma." };
      return { error: error.message };
    }

    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classroom");
    return {};
  } catch (err) {
    if (err instanceof PermissionError) return { error: "Sem permissão." };
    return {
      error: err instanceof Error ? err.message : "Erro ao adicionar.",
    };
  }
}

export async function removeClassMember(
  classId: string,
  classMemberRowId: string,
): Promise<{ error?: string }> {
  try {
    const actor = await assertCapability("manage_classes");
    const supabase = await createClient();

    const { data: klass } = await supabase
      .from("classes")
      .select("id")
      .eq("id", classId)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();
    if (!klass) return { error: "Turma não encontrada." };

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("id", classMemberRowId)
      .eq("class_id", classId);

    if (error) return { error: error.message };

    revalidatePath(`/classes/${classId}`);
    revalidatePath("/classroom");
    return {};
  } catch (err) {
    if (err instanceof PermissionError) return { error: "Sem permissão." };
    return {
      error: err instanceof Error ? err.message : "Erro ao remover.",
    };
  }
}
