/** Canonical belt colors used across journey, dashboard, etc. */
export const BELT_SWATCH: Record<string, string> = {
  Branca: "#f5f5f5",
  Cinza: "#9ca3af",
  Amarela: "#eab308",
  Laranja: "#f97316",
  Verde: "#22c55e",
  Azul: "#2563eb",
  Roxa: "#7c3aed",
  Marrom: "#92400e",
  Preta: "#0a0a0a",
  Coral: "#fb7185",
  Vermelha: "#e10600",
  "Sem faixa": "#525252",
};

const LIGHT_BELTS = new Set(["Branca", "Amarela", "Cinza"]);

export function beltSwatch(belt: string | null | undefined): string {
  if (!belt) return BELT_SWATCH["Sem faixa"];
  return BELT_SWATCH[belt] ?? BELT_SWATCH["Sem faixa"];
}

/** True when belt background needs dark ink for contrast. */
export function beltNeedsDarkInk(belt: string | null | undefined): boolean {
  if (!belt) return false;
  return LIGHT_BELTS.has(belt);
}
