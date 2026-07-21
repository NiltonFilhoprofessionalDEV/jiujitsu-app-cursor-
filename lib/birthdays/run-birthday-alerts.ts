import {
  formatBirthdayNotification,
  listBirthdaysInRange,
  type BirthdayMemberInput,
} from "@/lib/birthdays/range";
import { resolveTimezone, zonedParts } from "@/lib/sessions/auto-open";
import { createAdminClient } from "@/lib/supabase/admin";

const STAFF_ROLES = ["owner", "administrator", "instructor"] as const;

export type BirthdayAlertsResult = {
  academies: number;
  notified: number;
  skipped: number;
};

export async function runBirthdayAlerts(
  now = new Date(),
): Promise<BirthdayAlertsResult> {
  const supabase = createAdminClient();

  const { data: academies, error: academiesError } = await supabase
    .from("academies")
    .select("id, timezone");
  if (academiesError) throw academiesError;

  let notified = 0;
  let skipped = 0;

  for (const academy of academies ?? []) {
    const academyId = academy.id as string;
    const timeZone = resolveTimezone(
      null,
      (academy.timezone as string | null) ?? null,
    );
    const today = zonedParts(now, timeZone).dateStr;

    const [{ data: memberRows }, { data: staffRows }] = await Promise.all([
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
      supabase
        .from("academy_members")
        .select("id, profile_id, role")
        .eq("academy_id", academyId)
        .eq("status", "active")
        .in("role", [...STAFF_ROLES])
        .not("profile_id", "is", null),
    ]);

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

    const todays = listBirthdaysInRange(inputs, today, 0).filter(
      (entry) => entry.is_today,
    );
    if (todays.length === 0) continue;

    const staff = (staffRows ?? []).flatMap((row) => {
      const profileId = row.profile_id as string | null;
      if (!profileId) return [];
      return [{ profileId }];
    });

    for (const staffMember of staff) {
      const candidates = todays.filter(
        (entry) => entry.profile_id !== staffMember.profileId,
      );
      if (candidates.length === 0) {
        skipped += 1;
        continue;
      }

      const { data: alreadySent } = await supabase
        .from("birthday_notifications_sent")
        .select("birthday_profile_id")
        .eq("academy_id", academyId)
        .eq("staff_profile_id", staffMember.profileId)
        .eq("for_date", today)
        .in(
          "birthday_profile_id",
          candidates.map((c) => c.profile_id),
        );

      const sentSet = new Set(
        (alreadySent ?? []).map((row) => row.birthday_profile_id as string),
      );
      const pending = candidates.filter((c) => !sentSet.has(c.profile_id));
      if (pending.length === 0) {
        skipped += 1;
        continue;
      }

      const { title, description } = formatBirthdayNotification(
        pending.map((p) => p.name),
      );

      const { error: notifyError } = await supabase.rpc("notify_profile", {
        p_profile_id: staffMember.profileId,
        p_title: title,
        p_description: description,
      });
      if (notifyError) throw notifyError;

      const { error: dedupeError } = await supabase
        .from("birthday_notifications_sent")
        .insert(
          pending.map((entry) => ({
            academy_id: academyId,
            birthday_profile_id: entry.profile_id,
            staff_profile_id: staffMember.profileId,
            for_date: today,
          })),
        );
      if (dedupeError) throw dedupeError;

      notified += 1;
    }
  }

  return {
    academies: (academies ?? []).length,
    notified,
    skipped,
  };
}
