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
import {
  ALL_CONFIGURABLE_BELTS,
  saveBeltRequirementsSchema,
} from "@/lib/validations/belt-requirements";

export type BeltRequirementsActionState = {
  error?: string;
  success?: string;
} | null;

export type EligibleGraduationCandidate = {
  memberId: string;
  memberName: string;
  currentBelt: string;
  currentDegree: number;
  kind: "degree" | "belt";
  targetBelt: string;
  targetDegree: number;
  classesSinceGraduation: number;
  classesPerDegree: number;
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

export async function listBeltRequirements(): Promise<BeltRequirement[]> {
  const member = await getActiveMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_belt_requirements")
    .select("belt, classes_per_degree")
    .eq("academy_id", member.academy_id);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    belt: row.belt as string,
    classesPerDegree: Number(row.classes_per_degree),
  }));
}

export async function listBeltRequirementsForForm(): Promise<
  { belt: string; classesPerDegree: number | "" }[]
> {
  const existing = await listBeltRequirements();
  const map = new Map(existing.map((r) => [r.belt, r.classesPerDegree]));
  return ALL_CONFIGURABLE_BELTS.map((belt) => ({
    belt,
    classesPerDegree: map.get(belt) ?? "",
  }));
}

export async function saveBeltRequirements(
  _prev: BeltRequirementsActionState,
  formData: FormData,
): Promise<BeltRequirementsActionState> {
  try {
    const actor = await assertCapability("graduate");

    const rows: { belt: string; classes_per_degree: string }[] = [];
    for (const belt of ALL_CONFIGURABLE_BELTS) {
      const raw = formData.get(`classes_${belt}`);
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      rows.push({ belt, classes_per_degree: trimmed });
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
    .select("id, current_belt, current_degree, joined_at, academy_id")
    .eq("id", targetId)
    .eq("academy_id", membership.academy_id)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) return null;

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
  });
}

async function listStaffProfileIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  academyId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("academy_members")
    .select("profile_id, role")
    .eq("academy_id", academyId)
    .eq("status", "active")
    .in("role", ["owner", "administrator", "instructor"]);

  if (error) throw error;
  return [
    ...new Set(
      (data ?? [])
        .map((row) => row.profile_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

/**
 * When a student becomes eligible, notify staff once per target.
 * Safe to call after attendance / from journey.
 */
export async function checkAndNotifyGraduationEligibility(
  memberId: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: target, error } = await supabase
      .from("academy_members")
      .select(
        "id, academy_id, current_belt, current_degree, joined_at, profile_id, profiles!profile_id(name)",
      )
      .eq("id", memberId)
      .maybeSingle();

    if (error || !target) return;

    const academyId = target.academy_id as string;
    const { data: latestGrad } = await supabase
      .from("graduation_history")
      .select("graduated_at")
      .eq("member_id", memberId)
      .order("graduated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since =
      (latestGrad?.graduated_at as string | undefined) ??
      (target.joined_at as string | null) ??
      null;

    const { data: reqRows } = await supabase
      .from("academy_belt_requirements")
      .select("belt, classes_per_degree")
      .eq("academy_id", academyId);

    const requirements: BeltRequirement[] = (reqRows ?? []).map((row) => ({
      belt: row.belt as string,
      classesPerDegree: Number(row.classes_per_degree),
    }));

    const classesSince = await countClassesSince(supabase, memberId, since);
    const progress = computeBeltProgress({
      currentBelt: target.current_belt as string | null,
      currentDegree: target.current_degree as number | null,
      classesSinceGraduation: classesSince,
      requirements,
    });

    if (!progress.configured) return;

    const profile = target.profiles as
      | { name: string }
      | { name: string }[]
      | null;
    const name = Array.isArray(profile)
      ? profile[0]?.name
      : profile?.name;
    const studentName = name ?? "Aluno";

    const staffIds = await listStaffProfileIds(supabase, academyId);
    if (staffIds.length === 0) return;

    const alerts: {
      kind: "degree" | "belt";
      targetBelt: string;
      targetDegree: number;
      title: string;
      description: string;
    }[] = [];

    if (progress.eligibleForDegree && progress.nextDegree != null) {
      alerts.push({
        kind: "degree",
        targetBelt: progress.currentBelt,
        targetDegree: progress.nextDegree,
        title: "Aluno elegível a grau",
        description: `${studentName} completou as aulas para o ${progress.nextDegree}º grau na faixa ${progress.currentBelt}.`,
      });
    }

    if (progress.eligibleForBelt && progress.nextBelt) {
      alerts.push({
        kind: "belt",
        targetBelt: progress.nextBelt,
        targetDegree: 0,
        title: "Aluno elegível a faixa",
        description: `${studentName} completou as aulas para a faixa ${progress.nextBelt}.`,
      });
    }

    for (const alert of alerts) {
      const { error: insertError } = await supabase
        .from("graduation_eligibility_alerts")
        .insert({
          academy_id: academyId,
          member_id: memberId,
          kind: alert.kind,
          target_belt: alert.targetBelt,
          target_degree: alert.targetDegree,
          classes_at_alert: classesSince,
        });

      // Unique violation = already notified for this target
      if (insertError) {
        if (insertError.code === "23505") continue;
        continue;
      }

      for (const profileId of staffIds) {
        await supabase.rpc("notify_profile", {
          p_profile_id: profileId,
          p_title: alert.title,
          p_description: alert.description,
        });
      }
    }
  } catch {
    // Non-blocking
  }
}

export async function listEligibleGraduationCandidates(): Promise<
  EligibleGraduationCandidate[]
> {
  const membership = await getActiveMembership();
  if (!can(membership.role, "graduate")) return [];

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("academy_members")
    .select(
      "id, current_belt, current_degree, joined_at, role, status, profiles!profile_id(name)",
    )
    .eq("academy_id", membership.academy_id)
    .eq("status", "active")
    .eq("role", "student");

  if (error) throw error;

  const requirements = await listBeltRequirements();
  if (requirements.length === 0) return [];

  const candidates: EligibleGraduationCandidate[] = [];

  for (const row of members ?? []) {
    const { data: latestGrad } = await supabase
      .from("graduation_history")
      .select("graduated_at")
      .eq("member_id", row.id)
      .order("graduated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const since =
      (latestGrad?.graduated_at as string | undefined) ??
      (row.joined_at as string | null) ??
      null;

    const classesSince = await countClassesSince(
      supabase,
      row.id as string,
      since,
    );
    const progress = computeBeltProgress({
      currentBelt: row.current_belt as string | null,
      currentDegree: row.current_degree as number | null,
      classesSinceGraduation: classesSince,
      requirements,
    });

    if (!progress.configured) continue;

    const profile = row.profiles as
      | { name: string }
      | { name: string }[]
      | null;
    const memberName =
      (Array.isArray(profile) ? profile[0]?.name : profile?.name) ?? "Aluno";

    if (progress.eligibleForDegree && progress.nextDegree != null) {
      candidates.push({
        memberId: row.id as string,
        memberName,
        currentBelt: progress.currentBelt,
        currentDegree: progress.currentDegree,
        kind: "degree",
        targetBelt: progress.currentBelt,
        targetDegree: progress.nextDegree,
        classesSinceGraduation: classesSince,
        classesPerDegree: progress.classesPerDegree!,
      });
    } else if (progress.eligibleForBelt && progress.nextBelt) {
      candidates.push({
        memberId: row.id as string,
        memberName,
        currentBelt: progress.currentBelt,
        currentDegree: progress.currentDegree,
        kind: "belt",
        targetBelt: progress.nextBelt,
        targetDegree: 0,
        classesSinceGraduation: classesSince,
        classesPerDegree: progress.classesPerDegree!,
      });
    }
  }

  return candidates;
}

/** Clear eligibility alerts after a graduation is recorded. */
export async function clearEligibilityAlertsForMember(
  memberId: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from("graduation_eligibility_alerts")
      .delete()
      .eq("member_id", memberId);
  } catch {
    // ignore
  }
}

export { suggestNextGraduation };
