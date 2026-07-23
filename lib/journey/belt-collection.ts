import {
  beltSequenceForAge,
  hasUnlockedBelt,
  unlockedDegreeForBelt,
  type BeltAgeOverride,
} from "@/lib/belts/progression";
import { beltDegreeImageSrc } from "@/lib/belts/assets";
import { DEGREES_PER_BELT } from "@/lib/graduations/belt-progress";

export type JourneyBeltCard = {
  belt: string;
  unlocked: boolean;
  /** Highest degree unlocked on this belt; null if belt never earned */
  highestDegree: number | null;
  /** Degrees 0..4 unlock flags */
  degrees: { degree: number; unlocked: boolean }[];
  imageSrc: string;
  isCurrent: boolean;
};

export function buildJourneyBeltCollection(input: {
  age: number | null;
  currentBelt: string;
  currentDegree: number;
  history: { belt: string; degree: number }[];
  ageOverrides?: BeltAgeOverride[];
}): JourneyBeltCard[] {
  const sequence = beltSequenceForAge(input.age, input.ageOverrides);
  const currentBelt = input.currentBelt || "Branca";
  const currentDegree = Math.max(0, Math.min(4, input.currentDegree));

  return sequence.map((belt) => {
    const unlocked = hasUnlockedBelt(
      belt,
      input.history,
      currentBelt,
    );
    const highest = unlocked
      ? (unlockedDegreeForBelt(
          belt,
          input.history,
          currentBelt,
          currentDegree,
        ) ?? 0)
      : null;
    const displayDegree = highest ?? 0;
    const degrees = Array.from({ length: DEGREES_PER_BELT + 1 }, (_, degree) => ({
      degree,
      unlocked: highest != null && degree <= highest,
    }));

    return {
      belt,
      unlocked,
      highestDegree: highest,
      degrees,
      imageSrc: beltDegreeImageSrc(belt, displayDegree),
      isCurrent: belt === currentBelt,
    };
  });
}
