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

/** Suggested age windows for kids belts (IBJJF-style chart). */
export const KIDS_BELT_AGE_RANGES: Record<
  string,
  { minAge: number; maxAge: number }
> = {
  Branca: { minAge: 4, maxAge: 15 },
  "Cinza / Branca": { minAge: 4, maxAge: 15 },
  Cinza: { minAge: 4, maxAge: 15 },
  "Cinza / Preta": { minAge: 4, maxAge: 15 },
  "Amarela / Branca": { minAge: 7, maxAge: 15 },
  Amarela: { minAge: 7, maxAge: 15 },
  "Amarela / Preta": { minAge: 7, maxAge: 15 },
  "Laranja / Branca": { minAge: 10, maxAge: 15 },
  Laranja: { minAge: 10, maxAge: 15 },
  "Laranja / Preta": { minAge: 10, maxAge: 15 },
  "Verde / Branca": { minAge: 13, maxAge: 15 },
  Verde: { minAge: 13, maxAge: 15 },
  "Verde / Preta": { minAge: 13, maxAge: 15 },
};
