"use server";

import { revalidatePath } from "next/cache";
import {
  computeBeltProgress,
  type BeltProgress,
  type BeltRequirement,
} from "@/lib/graduations/belt-progress";
import { suggestNextGraduation } from "@/lib/graduations/suggest-next";
import {
  assertCapability,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthDate } from "@/lib/belts/options";
import {
  ALL_CONFIGURABLE_BELTS,
  defaultAgesForBelt,
  saveBeltRequirementsSchema,
} from "@/lib/validations/belt-requirements";

export type BeltRequirementsActionState = {
  error?: string;
  success?: string;
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

export type BeltRequirementFormRow = {
  belt: string;
  classesPerDegree: number | "";
  minAge: number | "";
  maxAge: number | "";
};

export async function listBeltRequirements(): Promise<BeltRequirement[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_belt_requirements")
    .select("belt, classes_per_degree, min_age, max_age")
    .eq("academy_id", member.academy_id);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    belt: row.belt as string,
    classesPerDegree: Number(row.classes_per_degree),
    minAge: (row.min_age as number | null) ?? null,
    maxAge: (row.max_age as number | null) ?? null,
  }));
}

export async function listBeltRequirementsForForm(): Promise<
  BeltRequirementFormRow[]
> {
  const existing = await listBeltRequirements();
  const map = new Map(existing.map((r) => [r.belt, r]));
  return ALL_CONFIGURABLE_BELTS.map((belt) => {
    const row = map.get(belt);
    const defaults = defaultAgesForBelt(belt);
    return {
      belt,
      classesPerDegree: row?.classesPerDegree ?? "",
      minAge: row?.minAge ?? defaults.minAge,
      maxAge:
        row?.maxAge !== undefined && row?.maxAge !== null
          ? row.maxAge
          : defaults.maxAge,
    };
  });
}

export async function saveBeltRequirements(
  _prev: BeltRequirementsActionState,
  formData: FormData,
): Promise<BeltRequirementsActionState> {
  try {
    const actor = await assertCapability("graduate");

    const rows: {
      belt: string;
      classes_per_degree: string;
      min_age: string;
      max_age: string;
    }[] = [];
    for (const belt of ALL_CONFIGURABLE_BELTS) {
      const raw = formData.get(`classes_${belt}`);
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const minRaw = formData.get(`min_age_${belt}`);
      const maxRaw = formData.get(`max_age_${belt}`);
      rows.push({
        belt,
        classes_per_degree: trimmed,
        min_age: typeof minRaw === "string" ? minRaw.trim() : "",
        max_age: typeof maxRaw === "string" ? maxRaw.trim() : "",
      });
    }

    const parsed = saveBeltRequirementsSchema.safeParse({
      requirements: rows,
    });
    if (!parsed.success) {
      return { error: firstValidationError(parsed.error) };
    }

    const supabase = await createClient();

    // Replace all requirements for this academy with the submitted set.
    const { error: deleteError } = await supabase
      .from("academy_belt_requirements")
      .delete()
      .eq("academy_id", actor.academy_id);
    if (deleteError) return { error: deleteError.message };

    if (parsed.data.requirements.length > 0) {
      const { error: insertError } = await supabase
        .from("academy_belt_requirements")
        .insert(
          parsed.data.requirements.map((row) => ({
            academy_id: actor.academy_id,
            belt: row.belt,
            classes_per_degree: row.classes_per_degree,
            min_age: row.min_age,
            max_age: row.max_age,
            updated_at: new Date().toISOString(),
          })),
        );
      if (insertError) return { error: insertError.message };
    }

    revalidatePath("/academy");
    revalidatePath("/journey");
    revalidatePath("/graduations");
    revalidatePath("/home");
    return { success: "Metas de graduação salvas." };
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "Sem permissão para configurar graduações." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível salvar as metas.",
    };
  }
}

async function countClassesSince(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  sinceDate: string | null,
): Promise<number> {
  let query = supabase
    .from("attendance_records")
    .select("id, class_sessions!inner(date)", { count: "exact", head: true })
    .eq("student_id", memberId);

  if (sinceDate) {
    const day = sinceDate.includes("T") ? sinceDate.slice(0, 10) : sinceDate;
    query = query.gte("class_sessions.date", day);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getMemberBeltProgress(
  memberId?: string,
): Promise<BeltProgress | null> {
  const membership = await getActiveMembership();
  const targetId = memberId ?? membership.id;

  if (
    targetId !== membership.id &&
    !can(membership.role, "view_members") &&
    !can(membership.role, "graduate")
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("academy_members")
    .select(
      "id, current_belt, current_degree, joined_at, academy_id, profiles!profile_id(birth_date)",
    )
    .eq("id", targetId)
    .eq("academy_id", membership.academy_id)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) return null;

  const profile = target.profiles as
    | { birth_date: string | null }
    | { birth_date: string | null }[]
    | null;
  const profileRow = Array.isArray(profile) ? profile[0] : profile;
  const age = ageFromBirthDate(profileRow?.birth_date);

  const { data: latestGrad } = await supabase
    .from("graduation_history")
    .select("graduated_at")
    .eq("member_id", targetId)
    .order("graduated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const since =
    (latestGrad?.graduated_at as string | undefined) ??
    (target.joined_at as string | null) ??
    null;

  const [requirements, classesSince] = await Promise.all([
    listBeltRequirements(),
    countClassesSince(supabase, targetId, since),
  ]);

  return computeBeltProgress({
    currentBelt: target.current_belt as string | null,
    currentDegree: target.current_degree as number | null,
    classesSinceGraduation: classesSince,
    requirements,
    age,
  });
}

export { suggestNextGraduation };
