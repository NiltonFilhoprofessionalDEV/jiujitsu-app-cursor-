import { BELT_OPTIONS } from "@/lib/validations/members";
import {
  suggestNextGraduationForAge,
  type BeltAgeOverride,
} from "@/lib/belts/progression";

/** Degrees on a belt before the next belt promotion (0→1→2→3→4). */
export const DEGREES_PER_BELT = 4;

export type BeltRequirement = {
  belt: string;
  classesPerDegree: number;
  minAge?: number | null;
  maxAge?: number | null;
};

export type BeltProgress = {
  currentBelt: string;
  currentDegree: number;
  classesSinceGraduation: number;
  classesPerDegree: number | null;
  nextDegree: number | null;
  classesToNextDegree: number | null;
  nextBelt: string | null;
  nextBeltDegree: number;
  classesToNextBelt: number | null;
  eligibleForDegree: boolean;
  eligibleForBelt: boolean;
  configured: boolean;
  ageBlocked: boolean;
  age: number | null;
};

export function requirementForBelt(
  requirements: BeltRequirement[],
  belt: string,
): number | null {
  const row = requirements.find((r) => r.belt === belt);
  if (!row || row.classesPerDegree < 1) return null;
  return row.classesPerDegree;
}

function overridesFrom(
  requirements: BeltRequirement[],
): BeltAgeOverride[] {
  return requirements.map((r) => ({
    belt: r.belt,
    minAge: r.minAge ?? null,
    maxAge: r.maxAge ?? null,
  }));
}

/**
 * Progress toward next degree / next belt.
 * One configured number = classes needed for EACH degree step on that belt.
 * Next belt respects age-based sequence.
 */
export function computeBeltProgress(input: {
  currentBelt: string | null | undefined;
  currentDegree: number | null | undefined;
  classesSinceGraduation: number;
  requirements: BeltRequirement[];
  age?: number | null;
}): BeltProgress {
  const age = input.age ?? null;
  const overrides = overridesFrom(input.requirements);
  const belt =
    input.currentBelt &&
    BELT_OPTIONS.includes(input.currentBelt as (typeof BELT_OPTIONS)[number])
      ? input.currentBelt
      : "Branca";
  const degree =
    typeof input.currentDegree === "number" && Number.isFinite(input.currentDegree)
      ? Math.max(0, Math.min(10, Math.trunc(input.currentDegree)))
      : 0;
  const classes = Math.max(0, Math.trunc(input.classesSinceGraduation));
  const perDegree = requirementForBelt(input.requirements, belt);
  const afterFour = suggestNextGraduationForAge(
    belt,
    DEGREES_PER_BELT,
    age,
    overrides,
  );
  const nextBeltName =
    afterFour.ageBlocked || afterFour.belt === belt ? null : afterFour.belt;
  const ageBlocked = Boolean(afterFour.ageBlocked);

  if (perDegree == null) {
    return {
      currentBelt: belt,
      currentDegree: degree,
      classesSinceGraduation: classes,
      classesPerDegree: null,
      nextDegree: degree < DEGREES_PER_BELT ? degree + 1 : null,
      classesToNextDegree: null,
      nextBelt: nextBeltName,
      nextBeltDegree: 0,
      classesToNextBelt: null,
      eligibleForDegree: false,
      eligibleForBelt: false,
      configured: false,
      ageBlocked,
      age,
    };
  }

  if (degree < DEGREES_PER_BELT) {
    const stepsToBelt = DEGREES_PER_BELT - degree;
    const classesToNextDegree = Math.max(0, perDegree - classes);
    const classesToNextBelt = Math.max(0, perDegree * stepsToBelt - classes);
    return {
      currentBelt: belt,
      currentDegree: degree,
      classesSinceGraduation: classes,
      classesPerDegree: perDegree,
      nextDegree: degree + 1,
      classesToNextDegree,
      nextBelt: nextBeltName,
      nextBeltDegree: 0,
      classesToNextBelt: nextBeltName ? classesToNextBelt : null,
      eligibleForDegree: classes >= perDegree,
      eligibleForBelt:
        Boolean(nextBeltName) && classes >= perDegree * stepsToBelt,
      configured: true,
      ageBlocked,
      age,
    };
  }

  const classesToNextBelt =
    nextBeltName != null ? Math.max(0, perDegree - classes) : null;
  return {
    currentBelt: belt,
    currentDegree: degree,
    classesSinceGraduation: classes,
    classesPerDegree: perDegree,
    nextDegree: null,
    classesToNextDegree: null,
    nextBelt: nextBeltName,
    nextBeltDegree: 0,
    classesToNextBelt,
    eligibleForDegree: false,
    eligibleForBelt: Boolean(nextBeltName) && classes >= perDegree,
    configured: true,
    ageBlocked,
    age,
  };
}
