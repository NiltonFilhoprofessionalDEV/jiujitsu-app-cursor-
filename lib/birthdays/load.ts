import {
  listBirthdaysInRange,
  type BirthdayEntry,
  type BirthdayMemberInput,
} from "@/lib/birthdays/range";
import { resolveTimezone, zonedParts } from "@/lib/sessions/auto-open";
import { createClient } from "@/lib/supabase/server";

export type { BirthdayEntry };

export async function loadAcademyBirthdays(
  academyId: string,
  daysAhead = 7,
): Promise<BirthdayEntry[]> {
  const supabase = await createClient();

  const [{ data: academyRow }, { data: memberRows }] = await Promise.all([
    supabase
      .from("academies")
      .select("timezone")
      .eq("id", academyId)
      .maybeSingle(),
    supabase
      .from("academy_members")
      .select(
        `
        id,
        profile_id,
        profiles!inner(id, name, birth_date)
      `,
      )
      .eq("academy_id", academyId)
      .eq("status", "active")
      .not("profile_id", "is", null),
  ]);

  const timeZone = resolveTimezone(
    null,
    (academyRow?.timezone as string | null) ?? null,
  );
  const today = zonedParts(new Date(), timeZone).dateStr;

  const inputs: BirthdayMemberInput[] = [];
  for (const row of memberRows ?? []) {
    const profile = row.profiles as
      | { id: string; name: string; birth_date: string | null }
      | { id: string; name: string; birth_date: string | null }[]
      | null;
    const one = Array.isArray(profile) ? profile[0] : profile;
    if (!one?.birth_date || !row.profile_id) continue;
    inputs.push({
      memberId: row.id as string,
      profileId: one.id,
      name: one.name,
      birthDate: one.birth_date,
    });
  }

  return listBirthdaysInRange(inputs, today, daysAhead);
}
