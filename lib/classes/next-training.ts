import {
  zonedLocalToUtc,
  zonedParts,
} from "@/lib/sessions/auto-open";

export type ScheduleSlot = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type NextTraining = {
  scheduleId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  /** Civil date of the occurrence (YYYY-MM-DD) in academy TZ */
  dateStr: string;
  /** Days from "today" in academy TZ (0 = today) */
  dayOffset: number;
  /** True when now is between start and end */
  isOngoing: boolean;
};

const WEEKDAY_SHORT_PT: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function weekdayOfDateStr(dateStr: string, timeZone: string): number {
  // Noon UTC-ish local: use mid-day to avoid DST edge issues when converting
  const mid = zonedLocalToUtc(dateStr, "12:00:00", timeZone);
  return zonedParts(mid, timeZone).weekday;
}

/**
 * Finds the next training occurrence from weekly schedules.
 * Prefers an ongoing class; otherwise the soonest future start within 8 days.
 */
export function findNextTraining(
  schedules: ScheduleSlot[],
  now: Date,
  timeZone: string,
): NextTraining | null {
  if (schedules.length === 0) return null;

  const today = zonedParts(now, timeZone);
  let best: NextTraining | null = null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const dateStr = addDaysToDateStr(today.dateStr, offset);
    const weekday = weekdayOfDateStr(dateStr, timeZone);

    for (const schedule of schedules) {
      if (schedule.weekday !== weekday) continue;

      const start = zonedLocalToUtc(dateStr, schedule.start_time, timeZone);
      const end = zonedLocalToUtc(dateStr, schedule.end_time, timeZone);

      // Skip occurrences that already ended
      if (now.getTime() >= end.getTime()) continue;

      const isOngoing =
        now.getTime() >= start.getTime() && now.getTime() < end.getTime();

      const candidate: NextTraining = {
        scheduleId: schedule.id,
        weekday: schedule.weekday,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        dateStr,
        dayOffset: offset,
        isOngoing,
      };

      if (!best) {
        best = candidate;
        continue;
      }

      // Prefer ongoing; otherwise earliest start
      if (candidate.isOngoing && !best.isOngoing) {
        best = candidate;
        continue;
      }
      if (best.isOngoing && !candidate.isOngoing) continue;

      const bestStart = zonedLocalToUtc(
        best.dateStr,
        best.startTime,
        timeZone,
      );
      if (start.getTime() < bestStart.getTime()) {
        best = candidate;
      }
    }

    // If we already found something on this/previous days, no need to scan further
    // except we need earliest across all — keep scanning but early exit if found today ongoing/upcoming
    if (best && offset === 0 && (best.isOngoing || best.dayOffset === 0)) {
      // still check other schedules today; after offset 0 loop ends we can continue
    }
  }

  return best;
}

export function formatTimeHm(value: string): string {
  return value.slice(0, 5);
}

export function formatNextTrainingLabel(next: NextTraining): string {
  const time = formatTimeHm(next.startTime);

  if (next.isOngoing) {
    return `Em andamento · até ${formatTimeHm(next.endTime)}`;
  }

  if (next.dayOffset === 0) {
    return `Hoje · ${time}`;
  }
  if (next.dayOffset === 1) {
    return `Amanhã · ${time}`;
  }
  return `${WEEKDAY_SHORT_PT[next.weekday] ?? "Treino"} · ${time}`;
}
