import { BELT_OPTIONS } from "@/lib/validations/members";
import {
  suggestNextGraduationForAge,
  type BeltAgeOverride,
} from "@/lib/belts/progression";

/** Back-compat: age-unaware suggestion uses full sequence (age null). */
export function suggestNextGraduation(
  currentBelt: string | null | undefined,
  currentDegree: number | null | undefined,
  age: number | null = null,
  overrides?: BeltAgeOverride[],
): { belt: string; degree: number; ageBlocked?: boolean } {
  return suggestNextGraduationForAge(
    currentBelt,
    currentDegree,
    age,
    overrides,
  );
}

export function isKnownBelt(belt: string): belt is (typeof BELT_OPTIONS)[number] {
  return (BELT_OPTIONS as readonly string[]).includes(belt);
}
