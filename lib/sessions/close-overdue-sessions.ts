import type { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveTimezone,
  shouldAutoClose,
} from "@/lib/sessions/auto-open";
import type { AutoSessionsResult } from "@/lib/sessions/run-auto-sessions-types";

type AdminClient = ReturnType<typeof createAdminClient>;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function noteSkip(result: AutoSessionsResult, reason: string) {
  result.skipped += 1;
  if (result.skipReasons.length < 40) {
    result.skipReasons.push(reason);
  }
}

type ScheduleEmbed = {
  end_time: string;
  auto_close_grace_minutes: number;
  classes:
    | {
        academies:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
        academy_units:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
      }
    | {
        academies:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
        academy_units:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
      }[]
    | null;
};

export async function closeOverdueSessions(
  supabase: AdminClient,
  now: Date,
  result: AutoSessionsResult,
) {
  const { data: openSessions, error: openError } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      date,
      schedule_id,
      class_schedules (
        end_time,
        auto_close_grace_minutes,
        classes (
          unit_id,
          academies ( timezone ),
          academy_units ( timezone )
        )
      )
    `,
    )
    .eq("status", "open")
    .not("schedule_id", "is", null);

  if (openError) {
    result.errors.push(openError.message);
    return;
  }

  for (const session of openSessions ?? []) {
    try {
      const schedule = one(
        session.class_schedules as ScheduleEmbed | ScheduleEmbed[] | null,
      );
      if (!schedule) {
        noteSkip(result, `${session.id}: missing_schedule`);
        continue;
      }

      const klass = one(schedule.classes);
      const academy = one(klass?.academies ?? null);
      const unit = one(klass?.academy_units ?? null);
      const timeZone = resolveTimezone(unit?.timezone, academy?.timezone);

      if (
        !shouldAutoClose({
          now,
          timeZone,
          sessionDate: session.date as string,
          endTime: schedule.end_time,
          graceMinutes: schedule.auto_close_grace_minutes,
        })
      ) {
        continue;
      }

      const { error: closeError } = await supabase
        .from("class_sessions")
        .update({
          status: "finished",
          finished_at: now.toISOString(),
        })
        .eq("id", session.id)
        .eq("status", "open");

      if (closeError) {
        result.errors.push(`${session.id}: ${closeError.message}`);
      } else {
        result.closed += 1;
      }
    } catch (err) {
      result.errors.push(
        `${session.id}: ${err instanceof Error ? err.message : "erro"}`,
      );
    }
  }
}
