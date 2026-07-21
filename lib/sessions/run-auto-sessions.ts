import { createAdminClient } from "@/lib/supabase/admin";
import { closeOverdueSessions } from "@/lib/sessions/close-overdue-sessions";
import {
  resolveTimezone,
  shouldAutoOpen,
  zonedParts,
} from "@/lib/sessions/auto-open";
import type { AutoSessionsResult } from "@/lib/sessions/run-auto-sessions-types";

export type { AutoSessionsResult } from "@/lib/sessions/run-auto-sessions-types";

type ScheduleRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  auto_open_enabled: boolean;
  auto_open_lead_minutes: number;
  auto_close_grace_minutes: number;
  classes:
    | {
        id: string;
        academy_id: string;
        unit_id: string | null;
        is_active: boolean;
        default_instructor_id: string | null;
        academies: { timezone: string | null } | { timezone: string | null }[] | null;
        academy_units:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
      }
    | {
        id: string;
        academy_id: string;
        unit_id: string | null;
        is_active: boolean;
        default_instructor_id: string | null;
        academies: { timezone: string | null } | { timezone: string | null }[] | null;
        academy_units:
          | { timezone: string | null }
          | { timezone: string | null }[]
          | null;
      }[]
    | null;
};

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

const ELIGIBLE_ROLES = new Set([
  "owner",
  "administrator",
  "instructor",
  "assistant_instructor",
]);

async function openDueSchedules(
  supabase: AdminClient,
  now: Date,
  result: AutoSessionsResult,
) {
  const { data: schedules, error: schedulesError } = await supabase
    .from("class_schedules")
    .select(
      `
      id,
      weekday,
      start_time,
      end_time,
      auto_open_enabled,
      auto_open_lead_minutes,
      auto_close_grace_minutes,
      classes!inner (
        id,
        academy_id,
        unit_id,
        is_active,
        default_instructor_id,
        academies ( timezone ),
        academy_units ( timezone )
      )
    `,
    )
    .eq("auto_open_enabled", true);

  if (schedulesError) {
    result.errors.push(schedulesError.message);
    return;
  }

  for (const raw of (schedules ?? []) as ScheduleRow[]) {
    try {
      const klass = one(raw.classes);
      if (!klass?.is_active) {
        noteSkip(result, `${raw.id}: class_inactive`);
        continue;
      }

      const academy = one(klass.academies);
      const unit = one(klass.academy_units);
      const timeZone = resolveTimezone(unit?.timezone, academy?.timezone);
      const parts = zonedParts(now, timeZone);

      const dueOpen = shouldAutoOpen({
        now,
        timeZone,
        weekday: raw.weekday,
        startTime: raw.start_time,
        endTime: raw.end_time,
        leadMinutes: raw.auto_open_lead_minutes,
      });

      if (!dueOpen) continue;

      const { data: dayOverride } = await supabase
        .from("class_schedule_day_overrides")
        .select("cancelled, substitute_instructor_id")
        .eq("schedule_id", raw.id)
        .eq("date", parts.dateStr)
        .maybeSingle();

      if (dayOverride?.cancelled) {
        noteSkip(result, `${raw.id}: day_cancelled`);
        continue;
      }

      const instructorId =
        dayOverride?.substitute_instructor_id ?? klass.default_instructor_id;

      if (!instructorId) {
        noteSkip(result, `${raw.id}: missing_instructor`);
        continue;
      }

      const { data: instructor } = await supabase
        .from("academy_members")
        .select("id, status, role")
        .eq("id", instructorId)
        .eq("academy_id", klass.academy_id)
        .maybeSingle();

      if (
        !instructor ||
        instructor.status !== "active" ||
        !ELIGIBLE_ROLES.has(instructor.role as string)
      ) {
        noteSkip(result, `${raw.id}: instructor_ineligible`);
        continue;
      }

      const { data: existing } = await supabase
        .from("class_sessions")
        .select("id")
        .eq("schedule_id", raw.id)
        .eq("date", parts.dateStr)
        .maybeSingle();

      if (existing) {
        noteSkip(result, `${raw.id}: already_exists`);
        continue;
      }

      const { error: insertError } = await supabase
        .from("class_sessions")
        .insert({
          class_id: klass.id,
          instructor_id: instructorId,
          schedule_id: raw.id,
          date: parts.dateStr,
          started_at: now.toISOString(),
          status: "open",
        });

      if (insertError) {
        if (insertError.code === "23505") {
          noteSkip(result, `${raw.id}: race_exists`);
        } else {
          result.errors.push(`${raw.id}: ${insertError.message}`);
        }
      } else {
        result.opened += 1;
      }
    } catch (err) {
      result.errors.push(
        `${raw.id}: ${err instanceof Error ? err.message : "erro"}`,
      );
    }
  }
}

export async function runAutoSessions(
  now = new Date(),
): Promise<AutoSessionsResult> {
  const result: AutoSessionsResult = {
    opened: 0,
    closed: 0,
    skipped: 0,
    errors: [],
    skipReasons: [],
  };

  const supabase = createAdminClient();
  await openDueSchedules(supabase, now, result);
  await closeOverdueSessions(supabase, now, result);
  return result;
}
