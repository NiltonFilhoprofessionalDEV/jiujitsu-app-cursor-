import {
  nextMilestone,
  trophyTitle,
  type JourneyTrack,
} from "@/lib/journey/milestones";
import { beltNeedsDarkInk, beltSwatch } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

export function JourneySummary({
  classCount,
  countLabel,
  currentBelt,
  currentDegree,
  track,
}: {
  classCount: number;
  countLabel: string;
  currentBelt: string | null;
  currentDegree: number | null;
  track: JourneyTrack;
}) {
  const next = nextMilestone(classCount, track);
  const remaining = next ? Math.max(next.threshold - classCount, 0) : 0;
  const progressPercent = next
    ? Math.min(100, Math.round((classCount / next.threshold) * 100))
    : 100;

  const swatch = beltSwatch(currentBelt);
  const darkInk = beltNeedsDarkInk(currentBelt);
  const isBlack = currentBelt === "Preta";

  return (
    <section
      className={cn(
        "space-y-4 rounded-2xl border p-5 shadow-[var(--surface-shadow)] sm:space-y-3 sm:p-4",
        darkInk ? "text-neutral-900" : "text-white",
      )}
      style={{
        background: swatch,
        borderColor: darkInk
          ? "rgba(0,0,0,0.12)"
          : "rgba(255,255,255,0.18)",
        boxShadow: isBlack
          ? "inset 0 0 0 1px rgba(255,255,255,0.12), var(--surface-shadow)"
          : undefined,
      }}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]",
              darkInk ? "text-neutral-800/70" : "text-white/75",
            )}
          >
            {countLabel}
          </p>
          <p className="font-display mt-1 text-4xl tabular-nums leading-none sm:mt-0.5 sm:text-3xl">
            {classCount}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p
            className={cn(
              "text-xs font-medium uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em]",
              darkInk ? "text-neutral-800/70" : "text-white/75",
            )}
          >
            Faixa atual
          </p>
          <p className="mt-1 text-lg font-semibold leading-tight sm:mt-0.5 sm:text-base">
            {currentBelt ?? "—"}
            {currentDegree ? ` · grau ${currentDegree}` : ""}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "space-y-2 border-t pt-4 sm:space-y-1.5 sm:pt-3",
          darkInk ? "border-black/15" : "border-white/20",
        )}
      >
        {next ? (
          <>
            <div
              className={cn(
                "flex items-start justify-between gap-3 text-sm leading-snug sm:items-center sm:text-xs",
                darkInk ? "text-neutral-800/75" : "text-white/80",
              )}
            >
              <span className="min-w-0">
                Próximo: {trophyTitle(next)} · {next.label}
              </span>
              <span className="shrink-0 tabular-nums">
                {remaining} {remaining === 1 ? "aula" : "aulas"}
              </span>
            </div>
            <div
              className={cn(
                "h-2.5 w-full overflow-hidden rounded-full sm:h-1.5",
                darkInk ? "bg-black/15" : "bg-white/25",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  darkInk ? "bg-neutral-900" : "bg-white",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          <p
            className={cn(
              "text-sm sm:text-xs",
              darkInk ? "text-neutral-800/75" : "text-white/80",
            )}
          >
            {track === "teaching"
              ? "Todos os troféus de aulas dadas conquistados."
              : "Todos os troféus de aulas conquistados. Continue treinando!"}
          </p>
        )}
      </div>
    </section>
  );
}
