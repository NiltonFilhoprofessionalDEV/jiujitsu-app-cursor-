import { BELT_OPTIONS } from "@/lib/validations/members";

export function suggestNextGraduation(
  currentBelt: string | null | undefined,
  currentDegree: number | null | undefined,
): { belt: string; degree: number } {
  const belt = currentBelt && BELT_OPTIONS.includes(currentBelt as (typeof BELT_OPTIONS)[number])
    ? (currentBelt as (typeof BELT_OPTIONS)[number])
    : "Branca";
  const degree = typeof currentDegree === "number" && Number.isFinite(currentDegree)
    ? Math.max(0, Math.min(10, Math.trunc(currentDegree)))
    : 0;

  // Colored belts typically advance degrees 0→4, then next belt.
  if (degree < 4) {
    return { belt, degree: degree + 1 };
  }

  const index = BELT_OPTIONS.indexOf(belt);
  if (index >= 0 && index < BELT_OPTIONS.length - 1) {
    return { belt: BELT_OPTIONS[index + 1]!, degree: 0 };
  }

  return { belt, degree: Math.min(degree + 1, 10) };
}
