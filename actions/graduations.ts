"use server";

import { revalidatePath } from "next/cache";
import { buildGraduationUpdate } from "@/lib/graduations/apply";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { createGraduationSchema } from "@/lib/validations/graduations";

export type GraduationActionState = {
  error?: string;
  success?: string;
} | null;

export type GraduationRow = {
  id: string;
  member_id: string;
  belt: string;
  degree: number;
  graduated_at: string;
  awarded_by: string | null;
  notes: string | null;
  member_name: string;
  awarded_by_name: string | null;
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

export async function listGraduations(): Promise<GraduationRow[]> {
  const member = await getActiveMembership();
  if (!can(member.role, "graduate") && !can(member.role, "view_members")) {
    throw new PermissionError(member.role, "graduate");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("graduation_history")
    .select(
      `
      id,
      member_id,
      belt,
      degree,
      graduated_at,
      awarded_by,
      notes,
      academy_members!member_id(
        academy_id,
        profiles(name)
      ),
      awarded:academy_members!awarded_by(
        profiles(name)
      )
    `,
    )
    .order("graduated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((row) => {
    const memberRel = row.academy_members as
      | {
          academy_id: string;
          profiles: { name: string } | { name: string }[] | null;
        }
      | {
          academy_id: string;
          profiles: { name: string } | { name: string }[] | null;
        }[]
      | null;
    const am = Array.isArray(memberRel) ? memberRel[0] : memberRel;
    if (!am || am.academy_id !== member.academy_id) {
      return [];
    }

    const profile = am.profiles
      ? Array.isArray(am.profiles)
        ? am.profiles[0]
        : am.profiles
      : null;

    const awardedRel = row.awarded as
      | { profiles: { name: string } | { name: string }[] | null }
      | { profiles: { name: string } | { name: string }[] | null }[]
      | null;
    const awarded = Array.isArray(awardedRel) ? awardedRel[0] : awardedRel;
    const awardedProfile = awarded?.profiles
      ? Array.isArray(awarded.profiles)
        ? awarded.profiles[0]
        : awarded.profiles
      : null;

    return [
      {
        id: row.id as string,
        member_id: row.member_id as string,
        belt: row.belt as string,
        degree: row.degree as number,
        graduated_at: row.graduated_at as string,
        awarded_by: (row.awarded_by as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        member_name: profile?.name ?? "Membro",
        awarded_by_name: awardedProfile?.name ?? null,
      },
    ];
  });
}

export async function createGraduation(
  _prevState: GraduationActionState,
  formData: FormData,
): Promise<GraduationActionState> {
  try {
    const actor = await assertCapability("graduate");

    const parsed = createGraduationSchema.safeParse({
      member_id: formData.get("member_id"),
      belt: formData.get("belt"),
      degree: formOptional(formData, "degree") || "0",
      notes: formOptional(formData, "notes"),
      graduated_at: formOptional(formData, "graduated_at"),
    });

    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();
    const { data: target, error: targetError } = await supabase
      .from("academy_members")
      .select("id, profile_id, academy_id, current_belt, current_degree")
      .eq("id", parsed.data.member_id)
      .eq("academy_id", actor.academy_id)
      .maybeSingle();

    if (targetError) {
      return { error: targetError.message };
    }
    if (!target) {
      return { error: "Membro não encontrado nesta academia." };
    }

    const { history, memberPatch } = buildGraduationUpdate({
      memberId: target.id as string,
      belt: parsed.data.belt,
      degree: parsed.data.degree,
      awardedBy: actor.id,
      notes: parsed.data.notes ?? null,
      graduatedAt: parsed.data.graduated_at,
    });

    const { error: insertError } = await supabase
      .from("graduation_history")
      .insert(history);

    if (insertError) {
      return { error: insertError.message };
    }

    const { error: updateError } = await supabase
      .from("academy_members")
      .update({
        ...memberPatch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", target.id)
      .eq("academy_id", actor.academy_id);

    if (updateError) {
      return { error: updateError.message };
    }

    await supabase.from("notifications").insert({
      profile_id: target.profile_id,
      title: "Nova graduação",
      description: `Você foi graduado para faixa ${memberPatch.current_belt} (grau ${memberPatch.current_degree}).`,
    });

    revalidatePath("/graduations");
    revalidatePath("/members");
    revalidatePath(`/members/${target.id}`);
    revalidatePath("/home");
    return { success: "Graduação registrada com sucesso." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para graduar alunos." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível registrar a graduação.",
    };
  }
}
