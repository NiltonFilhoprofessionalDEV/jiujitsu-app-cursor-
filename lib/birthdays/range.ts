export type BirthdayMemberInput = {
  memberId: string;
  profileId: string;
  name: string;
  birthDate: string;
};

export type BirthdayEntry = {
  member_id: string;
  profile_id: string;
  name: string;
  birth_date: string;
  occurs_on: string;
  age: number | null;
  is_today: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function ymdString(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${pad2(m)}-${pad2(d)}`;
}

/** Civil occurrence of birth month/day in `year` (Feb 29 → Feb 28 if non-leap). */
export function birthdayOccurrenceInYear(
  birthMonth: number,
  birthDay: number,
  year: number,
): string {
  let day = birthDay;
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) {
    day = 28;
  }
  return ymdString(year, birthMonth, day);
}

function utcNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

function addDaysYmd(ymd: string, days: number): string {
  const date = utcNoon(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return ymdString(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** Age completed on the birthday occurrence date (year delta). */
function ageOnOccurrence(birthYmd: string, occursOn: string): number | null {
  const birth = parseYmd(birthYmd);
  const on = parseYmd(occursOn);
  if (!birth || !on) return null;
  const age = on.y - birth.y;
  return age >= 0 ? age : null;
}

/**
 * Next birthday on or after `today` (YYYY-MM-DD), within `daysAhead` inclusive.
 * Window length is `daysAhead` days after today (today + 7 → 8 calendar days).
 */
export function listBirthdaysInRange(
  members: BirthdayMemberInput[],
  today: string,
  daysAhead = 7,
): BirthdayEntry[] {
  const todayParts = parseYmd(today);
  if (!todayParts) return [];

  const end = addDaysYmd(today, daysAhead);
  const entries: BirthdayEntry[] = [];

  for (const member of members) {
    const birth = parseYmd(member.birthDate);
    if (!birth) continue;

    let occursOn = birthdayOccurrenceInYear(birth.m, birth.d, todayParts.y);
    if (occursOn < today) {
      occursOn = birthdayOccurrenceInYear(birth.m, birth.d, todayParts.y + 1);
    }

    if (occursOn > end) continue;

    entries.push({
      member_id: member.memberId,
      profile_id: member.profileId,
      name: member.name,
      birth_date: member.birthDate,
      occurs_on: occursOn,
      age: ageOnOccurrence(member.birthDate, occursOn),
      is_today: occursOn === today,
    });
  }

  entries.sort((a, b) => {
    if (a.is_today !== b.is_today) return a.is_today ? -1 : 1;
    if (a.occurs_on !== b.occurs_on) return a.occurs_on.localeCompare(b.occurs_on);
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return entries;
}

export function formatBirthdayNotification(names: string[]): {
  title: string;
  description: string;
} {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return { title: "Aniversário hoje", description: "" };
  }
  if (cleaned.length === 1) {
    return {
      title: "Aniversário hoje",
      description: `${cleaned[0]} faz aniversário hoje`,
    };
  }
  if (cleaned.length === 2) {
    return {
      title: "Aniversários hoje",
      description: `${cleaned[0]} e ${cleaned[1]}`,
    };
  }
  return {
    title: "Aniversários hoje",
    description: `${cleaned[0]}, ${cleaned[1]} e mais ${cleaned.length - 2}…`,
  };
}
