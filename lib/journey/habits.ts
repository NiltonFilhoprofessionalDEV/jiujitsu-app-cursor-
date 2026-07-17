import { zonedParts } from "@/lib/sessions/auto-open";

export const DEFAULT_WEEKLY_GOAL_STUDENT = 3;
export const DEFAULT_WEEKLY_GOAL_TEACHING = 2;
export const MONTHLY_HISTORY_MONTHS = 6;

export type WeeklyGoalProgress = {
  current: number;
  target: number;
  percent: number;
  met: boolean;
};

export type StreakStats = {
  weeks: number;
  /** True when the current calendar week already has activity */
  activeThisWeek: boolean;
};

export type MonthBucket = {
  key: string; // YYYY-MM
  label: string;
  count: number;
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

/** Monday (weekday 1) of the week containing dateStr, in civil calendar math. */
export function mondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: 0 Sun .. 6 Sat → offset to Monday
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function todayDateStr(now: Date, timeZone: string): string {
  return zonedParts(now, timeZone).dateStr;
}

export function uniqueSortedDates(dates: string[]): string[] {
  return [...new Set(dates.filter(Boolean))].sort();
}

export function computeWeeklyGoal(
  activityDates: string[],
  now: Date,
  timeZone: string,
  target: number,
): WeeklyGoalProgress {
  const today = todayDateStr(now, timeZone);
  const weekStart = mondayOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const current = uniqueSortedDates(activityDates).filter(
    (d) => d >= weekStart && d <= weekEnd,
  ).length;

  const safeTarget = Math.max(1, target);
  return {
    current,
    target: safeTarget,
    percent: Math.min(100, Math.round((current / safeTarget) * 100)),
    met: current >= safeTarget,
  };
}

/**
 * Consecutive weeks (Mon–Sun) with ≥1 activity.
 * If this week has no activity yet, streak can still count from last week.
 */
export function computeWeekStreak(
  activityDates: string[],
  now: Date,
  timeZone: string,
): StreakStats {
  const today = todayDateStr(now, timeZone);
  const thisMonday = mondayOfWeek(today);
  const weeksWithActivity = new Set(
    uniqueSortedDates(activityDates).map((d) => mondayOfWeek(d)),
  );

  const activeThisWeek = weeksWithActivity.has(thisMonday);
  let cursor = activeThisWeek ? thisMonday : addDays(thisMonday, -7);

  if (!weeksWithActivity.has(cursor)) {
    return { weeks: 0, activeThisWeek: false };
  }

  let weeks = 0;
  while (weeksWithActivity.has(cursor)) {
    weeks += 1;
    cursor = addDays(cursor, -7);
  }

  return { weeks, activeThisWeek };
}

const MONTH_LABELS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function computeMonthlyHistory(
  activityDates: string[],
  now: Date,
  timeZone: string,
  months = MONTHLY_HISTORY_MONTHS,
): MonthBucket[] {
  const today = zonedParts(now, timeZone);
  const counts = new Map<string, number>();
  for (const d of uniqueSortedDates(activityDates)) {
    const key = d.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: MonthBucket[] = [];
  let y = today.year;
  let m = today.month; // 1-12

  for (let i = 0; i < months; i += 1) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    buckets.unshift({
      key,
      label: MONTH_LABELS_PT[m - 1] ?? key,
      count: counts.get(key) ?? 0,
    });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }

  return buckets;
}
