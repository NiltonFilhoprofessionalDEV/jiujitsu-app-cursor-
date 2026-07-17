import {
  resolveTimezone,
  zonedLocalToUtc,
  zonedParts,
} from "@/lib/sessions/auto-open";

export type NextAutoOpenPreview = {
  scheduleId: string;
  weekday: number;
  startTime: string;
  openAt: Date;
  trainAt: Date;
  leadMinutes: number;
};

type ScheduleLike = {
  id: string;
  weekday: number;
  start_time: string;
  auto_open_enabled: boolean;
  auto_open_lead_minutes: number;
};

type CancelledDay = {
  schedule_id: string;
  date: string;
  cancelled: boolean;
};

/** Find the next auto-open moment for enabled schedules (skips cancelled days). */
export function findNextAutoOpen(input: {
  schedules: ScheduleLike[];
  cancelledDays?: CancelledDay[];
  now?: Date;
  timeZone?: string;
}): NextAutoOpenPreview | null {
  const now = input.now ?? new Date();
  const timeZone = resolveTimezone(input.timeZone, null);
  const cancelled = new Set(
    (input.cancelledDays ?? [])
      .filter((row) => row.cancelled)
      .map((row) => `${row.schedule_id}:${row.date}`),
  );

  const enabled = input.schedules.filter((s) => s.auto_open_enabled);
  if (enabled.length === 0) return null;

  let best: NextAutoOpenPreview | null = null;

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const probe = new Date(now.getTime() + dayOffset * 86_400_000);
    const parts = zonedParts(probe, timeZone);

    for (const schedule of enabled) {
      if (schedule.weekday !== parts.weekday) continue;
      if (cancelled.has(`${schedule.id}:${parts.dateStr}`)) continue;

      const trainAt = zonedLocalToUtc(
        parts.dateStr,
        schedule.start_time,
        timeZone,
      );
      const openAt = new Date(
        trainAt.getTime() - schedule.auto_open_lead_minutes * 60_000,
      );

      if (openAt.getTime() <= now.getTime()) continue;
      if (!best || openAt.getTime() < best.openAt.getTime()) {
        best = {
          scheduleId: schedule.id,
          weekday: schedule.weekday,
          startTime: schedule.start_time,
          openAt,
          trainAt,
          leadMinutes: schedule.auto_open_lead_minutes,
        };
      }
    }

    if (best && dayOffset >= 1) {
      // After scanning tomorrow+, we already have the soonest candidate in range.
      // Keep scanning to finish the weekday cycle for correctness on sparse grades.
    }
  }

  return best;
}

export function formatAutoOpenPreview(
  preview: NextAutoOpenPreview,
  timeZone: string,
): string {
  const openFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const trainFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Abre ${openFmt.format(preview.openAt)} · treino às ${trainFmt.format(preview.trainAt)}`;
}
