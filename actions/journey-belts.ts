"use server";

import { getActiveMembership } from "@/lib/permissions/assert";
import { ageFromBirthDate } from "@/lib/belts/options";
import {
  buildJourneyBeltCollection,
  type JourneyBeltCard,
} from "@/lib/journey/belt-collection";
import { createClient } from "@/lib/supabase/server";
import { listBeltRequirements } from "@/actions/belt-requirements";

export type JourneyBeltCollection = {
  cards: JourneyBeltCard[];
  age: number | null;
  ageMissing: boolean;
};

export async function getJourneyBeltCollection(): Promise<JourneyBeltCollection | null> {
  const membership = await getActiveMembership();
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from("academy_members")
    .select(
      "id, current_belt, current_degree, profiles!profile_id(birth_date)",
    )
    .eq("id", membership.id)
    .maybeSingle();

  if (error || !member) return null;

  const profile = member.profiles as
    | { birth_date: string | null }
    | { birth_date: string | null }[]
    | null;
  const profileRow = Array.isArray(profile) ? profile[0] : profile;
  const birthDate = profileRow?.birth_date ?? null;
  const age = ageFromBirthDate(birthDate);

  const [{ data: history }, requirements] = await Promise.all([
    supabase
      .from("graduation_history")
      .select("belt, degree, graduated_at")
      .eq("member_id", membership.id)
      .order("graduated_at", { ascending: true }),
    listBeltRequirements(),
  ]);

  const cards = buildJourneyBeltCollection({
    age,
    currentBelt: (member.current_belt as string) || "Branca",
    currentDegree: Number(member.current_degree ?? 0),
    history: (history ?? []).map((h) => ({
      belt: h.belt as string,
      degree: Number(h.degree ?? 0),
      graduatedAt: (h.graduated_at as string | null) ?? null,
    })),
    ageOverrides: requirements.map((r) => ({
      belt: r.belt,
      minAge: r.minAge ?? null,
      maxAge: r.maxAge ?? null,
    })),
  });

  return {
    cards,
    age,
    ageMissing: !birthDate,
  };
}
