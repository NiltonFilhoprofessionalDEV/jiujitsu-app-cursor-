import type { BeltProgress } from "@/lib/graduations/belt-progress";
import { cn } from "@/lib/utils";

export function JourneyBeltProgressCard({
  progress,
}: {
  progress: BeltProgress | null;
}) {
  if (!progress?.configured) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-4 text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
        A academia ainda não configurou as metas de aulas por faixa. Quando
        configurar, você verá aqui quanto falta para o próximo grau e a próxima
        faixa.
      </section>
    );
  }

  return <JourneyBeltProgress progress={progress} />;
}

function JourneyBeltProgress({ progress }: { progress: BeltProgress }) {
  const degreeTotal = progress.classesPerDegree ?? 0;
  const degreeDone = Math.min(degreeTotal, progress.classesSinceGraduation);
  const degreePercent =
    degreeTotal > 0
      ? Math.min(100, Math.round((degreeDone / degreeTotal) * 100))
      : 0;

  const beltNeeded =
    progress.classesToNextBelt != null
      ? progress.classesSinceGraduation + progress.classesToNextBelt
      : null;
  const beltPercent =
    beltNeeded && beltNeeded > 0
      ? Math.min(
          100,
          Math.round((progress.classesSinceGraduation / beltNeeded) * 100),
        )
      : progress.eligibleForBelt
        ? 100
        : 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)]">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Próxima graduação
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {progress.classesSinceGraduation}{" "}
          {progress.classesSinceGraduation === 1 ? "aula" : "aulas"} desde a
          última graduação
          {progress.classesPerDegree
            ? ` · meta ${progress.classesPerDegree} por grau`
            : null}
        </p>
      </div>

      {progress.nextDegree != null && progress.classesToNextDegree != null ? (
        <ProgressRow
          label={`Próximo grau · ${progress.nextDegree}º`}
          remaining={progress.classesToNextDegree}
          percent={degreePercent}
          eligible={progress.eligibleForDegree}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Você já está no {progress.currentDegree}º grau desta faixa.
        </p>
      )}

      {progress.nextBelt && progress.classesToNextBelt != null ? (
        <ProgressRow
          label={`Próxima faixa · ${progress.nextBelt}`}
          remaining={progress.classesToNextBelt}
          percent={beltPercent}
          eligible={progress.eligibleForBelt}
        />
      ) : null}
    </section>
  );
}

function ProgressRow({
  label,
  remaining,
  percent,
  eligible,
}: {
  label: string;
  remaining: number;
  percent: number;
  eligible: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            eligible
              ? "font-semibold text-emerald-500"
              : "text-muted-foreground",
          )}
        >
          {eligible
            ? "Elegível!"
            : remaining === 1
              ? "Falta 1 aula"
              : `Faltam ${remaining} aulas`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            eligible ? "bg-emerald-500" : "bg-[var(--action-red)]",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
