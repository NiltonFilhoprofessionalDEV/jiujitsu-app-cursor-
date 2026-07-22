/**
 * Kids (IBJJF) + adult belt progression used across the app.
 * Kids striped belts follow: Cor / Branca → Cor → Cor / Preta.
 */
export const BELT_OPTIONS = [
  // Infantil
  "Branca",
  "Cinza / Branca",
  "Cinza",
  "Cinza / Preta",
  "Amarela / Branca",
  "Amarela",
  "Amarela / Preta",
  "Laranja / Branca",
  "Laranja",
  "Laranja / Preta",
  "Verde / Branca",
  "Verde",
  "Verde / Preta",
  // Adulto
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Coral",
  "Vermelha",
] as const;

export type BeltOption = (typeof BELT_OPTIONS)[number];

export type BeltAgeRange = {
  minAge: number;
  /** null = sem limite superior */
  maxAge: number | null;
  track: "kids" | "adult" | "both";
};

/**
 * Default age windows (IBJJF-style).
 * Academia pode sobrescrever em academy_belt_requirements.
 */
export const DEFAULT_BELT_AGE_RANGES: Record<string, BeltAgeRange> = {
  Branca: { minAge: 4, maxAge: null, track: "both" },
  "Cinza / Branca": { minAge: 4, maxAge: 15, track: "kids" },
  Cinza: { minAge: 4, maxAge: 15, track: "kids" },
  "Cinza / Preta": { minAge: 4, maxAge: 15, track: "kids" },
  "Amarela / Branca": { minAge: 7, maxAge: 15, track: "kids" },
  Amarela: { minAge: 7, maxAge: 15, track: "kids" },
  "Amarela / Preta": { minAge: 7, maxAge: 15, track: "kids" },
  "Laranja / Branca": { minAge: 10, maxAge: 15, track: "kids" },
  Laranja: { minAge: 10, maxAge: 15, track: "kids" },
  "Laranja / Preta": { minAge: 10, maxAge: 15, track: "kids" },
  "Verde / Branca": { minAge: 13, maxAge: 15, track: "kids" },
  Verde: { minAge: 13, maxAge: 15, track: "kids" },
  "Verde / Preta": { minAge: 13, maxAge: 15, track: "kids" },
  Azul: { minAge: 16, maxAge: null, track: "adult" },
  Roxa: { minAge: 16, maxAge: null, track: "adult" },
  Marrom: { minAge: 16, maxAge: null, track: "adult" },
  Preta: { minAge: 16, maxAge: null, track: "adult" },
  Coral: { minAge: 16, maxAge: null, track: "adult" },
  Vermelha: { minAge: 16, maxAge: null, track: "adult" },
};

/** @deprecated use DEFAULT_BELT_AGE_RANGES */
export const KIDS_BELT_AGE_RANGES: Record<
  string,
  { minAge: number; maxAge: number }
> = Object.fromEntries(
  Object.entries(DEFAULT_BELT_AGE_RANGES)
    .filter(([, r]) => r.track === "kids" || r.track === "both")
    .map(([belt, r]) => [
      belt,
      { minAge: r.minAge, maxAge: r.maxAge ?? 15 },
    ]),
);

export function beltSlug(belt: string): string {
  return belt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ageFromBirthDate(
  birthDate: string | Date | null | undefined,
  now = new Date(),
): number | null {
  if (!birthDate) return null;
  const birth =
    typeof birthDate === "string" ? new Date(`${birthDate}T12:00:00`) : birthDate;
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}
