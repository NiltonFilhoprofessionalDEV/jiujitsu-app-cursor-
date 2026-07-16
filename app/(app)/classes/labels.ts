export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const WEEKDAY_OPTIONS = Object.entries(WEEKDAY_LABELS).map(
  ([value, label]) => [Number(value), label] as [number, string],
);

export function formatTime(value: string): string {
  return value.slice(0, 5);
}

export const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50";
