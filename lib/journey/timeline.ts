import {
  findMilestoneByCode,
  trophyTitle,
} from "@/lib/journey/milestones";

export type TimelineEventType =
  | "joined"
  | "belt"
  | "degree"
  | "achievement";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  at: string;
  /** Short secondary line (ex.: "Na faixa Azul", "5 aulas") */
  meta?: string;
};

export type TimelineGraduation = {
  id: string;
  belt: string;
  degree: number;
  graduated_at: string;
  notes?: string | null;
};

export type TimelineAchievement = {
  id: string;
  code: string;
  unlocked_at: string;
};

function toTime(iso: string): number {
  const value = iso.includes("T") ? iso : `${iso}T12:00:00`;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function classifyGraduations(
  graduations: TimelineGraduation[],
): TimelineEvent[] {
  const sorted = [...graduations].sort((a, b) => {
    const diff = toTime(a.graduated_at) - toTime(b.graduated_at);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const events: TimelineEvent[] = [];
  let previous: TimelineGraduation | null = null;

  for (const g of sorted) {
    const note = g.notes?.trim() || undefined;

    if (!previous || previous.belt !== g.belt) {
      events.push({
        id: g.id,
        type: "belt",
        title:
          g.degree > 0
            ? `Faixa ${g.belt} · grau ${g.degree}`
            : `Faixa ${g.belt}`,
        at: g.graduated_at,
        meta: note ?? (previous ? "Graduação de faixa" : "Faixa registrada"),
      });
    } else if (previous.degree !== g.degree) {
      events.push({
        id: g.id,
        type: "degree",
        title: `Grau ${g.degree}`,
        at: g.graduated_at,
        meta: note ?? `Na faixa ${g.belt}`,
      });
    } else {
      events.push({
        id: g.id,
        type: "belt",
        title: `Faixa ${g.belt} · grau ${g.degree}`,
        at: g.graduated_at,
        meta: note ?? "Graduação registrada",
      });
    }

    previous = g;
  }

  return events;
}

function classifyAchievements(
  achievements: TimelineAchievement[],
  milestoneLabels?: Record<string, string>,
): TimelineEvent[] {
  return achievements.map((a) => {
    const milestone = findMilestoneByCode(a.code);
    const fallback = milestoneLabels?.[a.code];
    const title = milestone
      ? trophyTitle(milestone)
      : fallback
        ? fallback.startsWith("Troféu")
          ? fallback
          : `Troféu: ${fallback}`
        : `Troféu: ${a.code}`;
    const meta = milestone?.label ?? undefined;

    return {
      id: a.id,
      type: "achievement" as const,
      title,
      at: a.unlocked_at,
      meta,
    };
  });
}

export function buildJourneyTimeline(input: {
  joinedAt: string | null;
  graduations: TimelineGraduation[];
  achievements: TimelineAchievement[];
  /** Optional override labels by achievement code */
  milestoneLabels?: Record<string, string>;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.joinedAt) {
    events.push({
      id: `joined-${input.joinedAt}`,
      type: "joined",
      title: "Entrou na academia",
      at: input.joinedAt,
      meta: "Início da jornada",
    });
  }

  events.push(...classifyGraduations(input.graduations));
  events.push(
    ...classifyAchievements(input.achievements, input.milestoneLabels),
  );

  return events.sort((a, b) => {
    const diff = toTime(b.at) - toTime(a.at);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}
