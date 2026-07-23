import {
  beltSequenceForAge,
  hasUnlockedBelt,
  unlockedDegreeForBelt,
  type BeltAgeOverride,
} from "@/lib/belts/progression";
import { beltDegreeImageSrc } from "@/lib/belts/assets";
import { DEGREES_PER_BELT } from "@/lib/graduations/belt-progress";

export type JourneyBeltHistoryRow = {
  belt: string;
  degree: number;
  graduatedAt: string | null;
};

export type JourneyBeltStage = {
  /** 0 = faixa sem grau; 1–4 = graus */
  degree: number;
  unlocked: boolean;
  imageSrc: string;
  earnedAt: string | null;
};

export type JourneyBeltCard = {
  belt: string;
  unlocked: boolean;
  /** Highest degree unlocked on this belt; null if belt never earned */
  highestDegree: number | null;
  /** Stripe pips only: degrees 1..4 */
  degrees: JourneyBeltStage[];
  /** Full gallery for detail: degree 0 + 1..4 */
  stages: JourneyBeltStage[];
  imageSrc: string;
  isCurrent: boolean;
  /** Date the belt itself (grau 0) was earned, if known */
  earnedAt: string | null;
};

function earnedAtFor(
  belt: string,
  degree: number,
  history: JourneyBeltHistoryRow[],
): string | null {
  let best: string | null = null;
  for (const row of history) {
    if (row.belt !== belt || row.degree !== degree || !row.graduatedAt) continue;
    if (best == null || row.graduatedAt < best) best = row.graduatedAt;
  }
  return best;
}

function buildStage(
  belt: string,
  degree: number,
  highest: number | null,
  history: JourneyBeltHistoryRow[],
): JourneyBeltStage {
  const unlocked = highest != null && degree <= highest;
  return {
    degree,
    unlocked,
    imageSrc: beltDegreeImageSrc(belt, degree),
    earnedAt: unlocked ? earnedAtFor(belt, degree, history) : null,
  };
}

export function buildJourneyBeltCollection(input: {
  age: number | null;
  currentBelt: string;
  currentDegree: number;
  history: JourneyBeltHistoryRow[];
  ageOverrides?: BeltAgeOverride[];
}): JourneyBeltCard[] {
  const sequence = beltSequenceForAge(input.age, input.ageOverrides);
  const currentBelt = input.currentBelt || "Branca";
  const currentDegree = Math.max(0, Math.min(4, input.currentDegree));

  return sequence.map((belt) => {
    const unlocked = hasUnlockedBelt(belt, input.history, currentBelt);
    const highest = unlocked
      ? (unlockedDegreeForBelt(
          belt,
          input.history,
          currentBelt,
          currentDegree,
        ) ?? 0)
      : null;
    const displayDegree = highest ?? 0;

    const stages = Array.from({ length: DEGREES_PER_BELT + 1 }, (_, degree) =>
      buildStage(belt, degree, highest, input.history),
    );
    // UI pips: only the 4 stripe degrees (1–4), not the bare belt (0).
    const degrees = stages.filter((s) => s.degree >= 1);

    return {
      belt,
      unlocked,
      highestDegree: highest,
      degrees,
      stages,
      imageSrc: beltDegreeImageSrc(belt, displayDegree),
      isCurrent: belt === currentBelt,
      earnedAt: stages[0]?.earnedAt ?? null,
    };
  });
}
