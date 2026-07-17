import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebPush } from "@/lib/push/web-push";
import {
  resolveTimezone,
  zonedLocalToUtc,
  zonedParts,
} from "@/lib/sessions/auto-open";
import { formatTimeHm } from "@/lib/classes/next-training";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

/** Cron every ~10 min: accept targets in [55, 70] minutes from now. */
const WINDOW_MIN = 55;
const WINDOW_MAX = 70;

export type ReminderRunResult = {
  checked: number;
  sent: number;
  skipped: number;
  errors: string[];
};

type ScheduleRow = {
  id: string;
  class_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  classes:
    | {
        id: string;
        name: string;
        academy_id: string;
        is_active: boolean;
        unit_id: string | null;
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
        id: string;
        name: string;
        academy_id: string;
        is_active: boolean;
        unit_id: string | null;
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

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function minutesUntil(now: Date, target: Date): number {
  return (target.getTime() - now.getTime()) / 60_000;
}

export async function runClassReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    checked: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  const admin = createAdminClient();

  const { data: schedules, error: schedulesError } = await admin
    .from("class_schedules")
    .select(
      `
      id,
      class_id,
      weekday,
      start_time,
      end_time,
      classes!inner(
        id,
        name,
        academy_id,
        is_active,
        unit_id,
        academies ( timezone ),
        academy_units ( timezone )
      )
    `,
    );

  if (schedulesError) {
    result.errors.push(schedulesError.message);
    return result;
  }

  for (const raw of (schedules ?? []) as ScheduleRow[]) {
    result.checked += 1;
    const klass = one(raw.classes);
    if (!klass || !klass.is_active) {
      result.skipped += 1;
      continue;
    }

    const academy = one(klass.academies);
    const unit = one(klass.academy_units);
    const timeZone = resolveTimezone(unit?.timezone, academy?.timezone);
    const parts = zonedParts(now, timeZone);
    if (parts.weekday !== raw.weekday) {
      result.skipped += 1;
      continue;
    }

    const { data: dayOverride } = await admin
      .from("class_schedule_day_overrides")
      .select("cancelled")
      .eq("schedule_id", raw.id)
      .eq("date", parts.dateStr)
      .maybeSingle();

    if (dayOverride?.cancelled) {
      result.skipped += 1;
      continue;
    }

    const startAt = zonedLocalToUtc(
      parts.dateStr,
      raw.start_time,
      timeZone,
    );
    const mins = minutesUntil(now, startAt);
    if (mins < WINDOW_MIN || mins > WINDOW_MAX) {
      result.skipped += 1;
      continue;
    }

    const { data: members, error: membersError } = await admin
      .from("class_members")
      .select(
        `
        member_id,
        academy_members!inner(
          id,
          profile_id,
          role,
          status
        )
      `,
      )
      .eq("class_id", raw.class_id);

    if (membersError) {
      result.errors.push(`${raw.id}: ${membersError.message}`);
      continue;
    }

    const studentProfiles = (members ?? []).flatMap((row) => {
      const am = one(
        row.academy_members as
          | {
              id: string;
              profile_id: string;
              role: string;
              status: string;
            }
          | {
              id: string;
              profile_id: string;
              role: string;
              status: string;
            }[]
          | null,
      );
      if (!am || am.status !== "active" || am.role !== "student") return [];
      return [am.profile_id];
    });

    const uniqueProfiles = [...new Set(studentProfiles)];
    if (uniqueProfiles.length === 0) continue;

    const timeLabel = formatTimeHm(raw.start_time);
    const dayLabel = WEEKDAY_LABELS[raw.weekday] ?? "Treino";
    const title = "Treino em 1 hora";
    const body = `${klass.name} · ${dayLabel} ${timeLabel}`;

    for (const profileId of uniqueProfiles) {
      const { error: logError } = await admin.from("class_reminder_log").insert({
        schedule_id: raw.id,
        profile_id: profileId,
        remind_date: parts.dateStr,
      });

      // Unique violation = already reminded today
      if (logError) {
        if (logError.code === "23505") {
          result.skipped += 1;
          continue;
        }
        result.errors.push(`${raw.id}/${profileId}: ${logError.message}`);
        continue;
      }

      await admin.from("notifications").insert({
        profile_id: profileId,
        title,
        description: body,
        is_read: false,
      });

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("profile_id", profileId);

      for (const sub of subs ?? []) {
        const sent = await sendWebPush({
          subscription: {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh as string,
              auth: sub.auth as string,
            },
          },
          title,
          body,
          url: "/checkin",
        });

        if (sent.ok) {
          result.sent += 1;
        } else if (sent.gone) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id as string);
        } else {
          result.errors.push(
            `push ${sub.id}: status ${sent.statusCode ?? "unknown"}`,
          );
        }
      }
    }
  }

  return result;
}
