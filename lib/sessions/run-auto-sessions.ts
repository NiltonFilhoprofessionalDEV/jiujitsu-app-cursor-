import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveTimezone,
  shouldAutoClose,
  shouldAutoOpen,
  zonedParts,
} from "@/lib/sessions/auto-open";

export type AutoSessionsResult = {
  opened: number;
  closed: number;
  skipped: number;
  errors: string[];
};

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

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function runAutoSessions(
  now = new Date(),
): Promise<AutoSessionsResult> {
  const result: AutoSessionsResult = {
    opened: 0,
    closed: 0,
    skipped: 0,
    errors: [],
  };

  const supabase = createAdminClient();

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
    return result;
  }

  for (const raw of (schedules ?? []) as ScheduleRow[]) {
    try {
      const klass = one(raw.classes);
      if (!klass?.is_active) {
        result.skipped += 1;
        continue;
      }
      if (!klass.default_instructor_id) {
        result.skipped += 1;
        continue;
      }

      const academy = one(klass.academies);
      const unit = one(klass.academy_units);
      const timeZone = resolveTimezone(unit?.timezone, academy?.timezone);
      const parts = zonedParts(now, timeZone);

      const { data: instructor } = await supabase
        .from("academy_members")
        .select("id, status, role")
        .eq("id", klass.default_instructor_id)
        .eq("academy_id", klass.academy_id)
        .maybeSingle();

      const eligibleRoles = new Set([
        "owner",
        "administrator",
        "instructor",
        "assistant_instructor",
      ]);

      if (
        !instructor ||
        instructor.status !== "active" ||
        !eligibleRoles.has(instructor.role as string)
      ) {
        result.skipped += 1;
        continue;
      }

      const dueOpen = shouldAutoOpen({
        now,
        timeZone,
        weekday: raw.weekday,
        startTime: raw.start_time,
        endTime: raw.end_time,
        leadMinutes: raw.auto_open_lead_minutes,
      });

      if (dueOpen) {
        const { data: existing } = await supabase
          .from("class_sessions")
          .select("id")
          .eq("schedule_id", raw.id)
          .eq("date", parts.dateStr)
          .maybeSingle();

        if (existing) {
          result.skipped += 1;
        } else {
          const { error: insertError } = await supabase
            .from("class_sessions")
            .insert({
              class_id: klass.id,
              instructor_id: klass.default_instructor_id,
              schedule_id: raw.id,
              date: parts.dateStr,
              started_at: now.toISOString(),
              status: "open",
            });

          if (insertError) {
            // Unique race: treat as skip
            if (insertError.code === "23505") {
              result.skipped += 1;
            } else {
              result.errors.push(`${raw.id}: ${insertError.message}`);
            }
          } else {
            result.opened += 1;
          }
        }
      }
    } catch (err) {
      result.errors.push(
        `${raw.id}: ${err instanceof Error ? err.message : "erro"}`,
      );
    }
  }

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
    return result;
  }

  for (const session of openSessions ?? []) {
    try {
      const schedule = one(
        session.class_schedules as
          | {
              end_time: string;
              auto_close_grace_minutes: number;
              classes:
                | {
                    academies: { timezone: string | null } | { timezone: string | null }[] | null;
                    academy_units:
                      | { timezone: string | null }
                      | { timezone: string | null }[]
                      | null;
                  }
                | {
                    academies: { timezone: string | null } | { timezone: string | null }[] | null;
                    academy_units:
                      | { timezone: string | null }
                      | { timezone: string | null }[]
                      | null;
                  }[]
                | null;
            }
          | {
              end_time: string;
              auto_close_grace_minutes: number;
              classes:
                | {
                    academies: { timezone: string | null } | { timezone: string | null }[] | null;
                    academy_units:
                      | { timezone: string | null }
                      | { timezone: string | null }[]
                      | null;
                  }
                | {
                    academies: { timezone: string | null } | { timezone: string | null }[] | null;
                    academy_units:
                      | { timezone: string | null }
                      | { timezone: string | null }[]
                      | null;
                  }[]
                | null;
            }[]
          | null,
      );
      if (!schedule) {
        result.skipped += 1;
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

  return result;
}
