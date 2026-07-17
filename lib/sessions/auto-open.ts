const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
  dateStr: string;
};

export function resolveTimezone(
  unitTimezone: string | null | undefined,
  academyTimezone: string | null | undefined,
): string {
  const unit = unitTimezone?.trim();
  if (unit) return unit;
  const academy = academyTimezone?.trim();
  if (academy) return academy;
  return DEFAULT_TIMEZONE;
}

export function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });

  const bag: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }

  const weekday = WEEKDAY_SHORT[bag.weekday ?? ""] ?? 0;
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);

  return {
    year,
    month,
    day,
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday,
    dateStr: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** Interpret a local civil date+time in `timeZone` as a UTC Date. */
export function zonedLocalToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm, ss] = normalizeTime(timeStr).split(":").map(Number);
  const desiredAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss || 0);

  let guess = desiredAsUtcMs;
  for (let i = 0; i < 3; i += 1) {
    const parts = zonedParts(new Date(guess), timeZone);
    const actualAsUtcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    guess += desiredAsUtcMs - actualAsUtcMs;
  }

  return new Date(guess);
}

export function shouldAutoOpen(input: {
  now: Date;
  timeZone: string;
  weekday: number;
  startTime: string;
  endTime: string;
  leadMinutes: number;
}): boolean {
  const parts = zonedParts(input.now, input.timeZone);
  if (parts.weekday !== input.weekday) return false;

  const start = zonedLocalToUtc(
    parts.dateStr,
    input.startTime,
    input.timeZone,
  );
  const end = zonedLocalToUtc(parts.dateStr, input.endTime, input.timeZone);
  const openAt = new Date(start.getTime() - input.leadMinutes * 60_000);

  return input.now.getTime() >= openAt.getTime() && input.now.getTime() < end.getTime();
}

export function shouldAutoClose(input: {
  now: Date;
  timeZone: string;
  sessionDate: string;
  endTime: string;
  graceMinutes: number;
}): boolean {
  const end = zonedLocalToUtc(
    input.sessionDate,
    input.endTime,
    input.timeZone,
  );
  const closeAt = new Date(end.getTime() + input.graceMinutes * 60_000);
  return input.now.getTime() >= closeAt.getTime();
}

export const BRAZIL_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
  { value: "America/Manaus", label: "Manaus" },
  { value: "America/Cuiaba", label: "Cuiabá" },
  { value: "America/Fortaleza", label: "Fortaleza" },
  { value: "America/Recife", label: "Recife" },
  { value: "America/Belem", label: "Belém" },
  { value: "America/Campo_Grande", label: "Campo Grande" },
  { value: "America/Porto_Velho", label: "Porto Velho" },
  { value: "America/Boa_Vista", label: "Boa Vista" },
  { value: "America/Rio_Branco", label: "Rio Branco" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
] as const;
