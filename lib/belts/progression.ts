import {
  BELT_OPTIONS,
  DEFAULT_BELT_AGE_RANGES,
  type BeltOption,
} from "@/lib/belts/options";
import { DEGREES_PER_BELT } from "@/lib/graduations/belt-progress";

export type BeltAgeOverride = {
  belt: string;
  minAge: number | null;
  maxAge: number | null;
};

function rangeFor(
  belt: string,
  overrides?: BeltAgeOverride[],
): { minAge: number; maxAge: number | null } {
  const override = overrides?.find((o) => o.belt === belt);
  const fallback = DEFAULT_BELT_AGE_RANGES[belt] ?? {
    minAge: 4,
    maxAge: null,
    track: "both" as const,
  };
  return {
    minAge: override?.minAge ?? fallback.minAge,
    maxAge:
      override?.maxAge !== undefined && override?.maxAge !== null
        ? override.maxAge
        : (fallback.maxAge ?? null),
  };
}

function isAgeAllowed(
  age: number | null,
  minAge: number,
  maxAge: number | null,
): boolean {
  if (age == null) {
    // Sem idade: libera trilha empírica completa (não bloqueia app).
    return true;
  }
  if (age < minAge) return false;
  if (maxAge != null && age > maxAge) return false;
  return true;
}

/**
 * Ordered belt sequence available for a given age.
 * Kids (<16): Branca + kids belts whose minAge ≤ age.
 * Adults (16+): Branca + adult belts.
 * Unknown age: full list (compat / até cadastrar birth_date).
 */
export function beltSequenceForAge(
  age: number | null,
  overrides?: BeltAgeOverride[],
): BeltOption[] {
  if (age == null) {
    return [...BELT_OPTIONS];
  }

  const adult = age >= 16;

  if (adult) {
    return BELT_OPTIONS.filter((belt) => {
      const meta = DEFAULT_BELT_AGE_RANGES[belt];
      if (!meta) return false;
      if (meta.track === "kids") return false;
      const { minAge, maxAge } = rangeFor(belt, overrides);
      return isAgeAllowed(age, minAge, maxAge);
    });
  }

  // Kids: kids track (+ Branca).
  return BELT_OPTIONS.filter((belt) => {
    const meta = DEFAULT_BELT_AGE_RANGES[belt];
    if (!meta) return false;
    if (meta.track === "adult") return false;
    const { minAge, maxAge } = rangeFor(belt, overrides);
    return isAgeAllowed(age, minAge, maxAge);
  });
}

export function suggestNextGraduationForAge(
  currentBelt: string | null | undefined,
  currentDegree: number | null | undefined,
  age: number | null,
  overrides?: BeltAgeOverride[],
): { belt: string; degree: number; ageBlocked?: boolean } {
  const sequence = beltSequenceForAge(age, overrides);
  const belt =
    currentBelt && sequence.includes(currentBelt as BeltOption)
      ? currentBelt
      : sequence[0] ?? "Branca";
  const degree =
    typeof currentDegree === "number" && Number.isFinite(currentDegree)
      ? Math.max(0, Math.min(10, Math.trunc(currentDegree)))
      : 0;

  if (degree < DEGREES_PER_BELT) {
    return { belt, degree: degree + 1 };
  }

  const index = sequence.indexOf(belt as BeltOption);
  if (index >= 0 && index < sequence.length - 1) {
    return { belt: sequence[index + 1]!, degree: 0 };
  }

  // Maybe next belt exists in full list but age blocks it.
  const fullIndex = BELT_OPTIONS.indexOf(belt as BeltOption);
  if (fullIndex >= 0 && fullIndex < BELT_OPTIONS.length - 1) {
    const candidate = BELT_OPTIONS[fullIndex + 1]!;
    const { minAge } = rangeFor(candidate, overrides);
    if (age != null && age < minAge) {
      return { belt, degree, ageBlocked: true };
    }
  }

  return { belt, degree: Math.min(degree + 1, 10) };
}

/** Highest degree unlocked for a belt from graduation history + current. */
export function unlockedDegreeForBelt(
  belt: string,
  history: { belt: string; degree: number }[],
  currentBelt: string,
  currentDegree: number,
): number | null {
  let max: number | null = null;
  for (const row of history) {
    if (row.belt !== belt) continue;
    max = max == null ? row.degree : Math.max(max, row.degree);
  }
  if (currentBelt === belt) {
    max = max == null ? currentDegree : Math.max(max, currentDegree);
  }
  return max;
}

export function hasUnlockedBelt(
  belt: string,
  history: { belt: string; degree: number }[],
  currentBelt: string,
): boolean {
  if (currentBelt === belt) return true;
  return history.some((h) => h.belt === belt);
}
