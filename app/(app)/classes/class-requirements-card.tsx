import { beltSwatch } from "@/lib/belts/colors";

function formatAgeRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) {
    if (min === max) return `${min} anos`;
    return `${min}–${max} anos`;
  }
  if (min != null) return `a partir de ${min}`;
  return `até ${max}`;
}

function formatBeltLabel(
  min: string | null | undefined,
  max: string | null | undefined,
): string | null {
  if (!min && !max) return null;
  if (min && max) return min === max ? min : `${min} → ${max}`;
  if (min) return `${min}+`;
  return `até ${max}`;
}

function BeltDot({ belt }: { belt: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20"
      style={{ background: beltSwatch(belt) }}
      aria-hidden
    />
  );
}

export function ClassRequirementsCard({
  minimumAge,
  maximumAge,
  minimumBelt,
  maximumBelt,
}: {
  minimumAge: number | null;
  maximumAge: number | null;
  minimumBelt: string | null;
  maximumBelt: string | null;
}) {
  const ageLabel = formatAgeRange(minimumAge, maximumAge);
  const beltLabel = formatBeltLabel(minimumBelt, maximumBelt);
  const beltDots = [minimumBelt, maximumBelt].filter(
    (value, index, list): value is string =>
      Boolean(value) && list.indexOf(value) === index,
  );

  if (!ageLabel && !beltLabel) return null;

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--surface-shadow)]">
      <dl className="space-y-2.5">
        {ageLabel ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted-foreground">Idade</dt>
            <dd className="text-sm font-medium text-foreground">{ageLabel}</dd>
          </div>
        ) : null}

        {beltLabel ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-xs text-muted-foreground">Faixa</dt>
            <dd className="flex items-center gap-2 text-sm font-medium text-foreground">
              {beltDots.length > 0 ? (
                <span className="flex items-center gap-1">
                  {beltDots.map((belt) => (
                    <BeltDot key={belt} belt={belt} />
                  ))}
                </span>
              ) : null}
              {beltLabel}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
