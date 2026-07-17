import { Flame, Target } from "lucide-react";
import type { JourneyTrack } from "@/lib/journey/milestones";
import type {
  MonthBucket,
  StreakStats,
  WeeklyGoalProgress,
} from "@/lib/journey/habits";
import { cn } from "@/lib/utils";

export function JourneyHabits({
  track,
  streak,
  weeklyGoal,
}: {
  track: JourneyTrack;
  streak: StreakStats;
  weeklyGoal: WeeklyGoalProgress;
}) {
  const streakHint =
    !streak.activeThisWeek && streak.weeks > 0
      ? track === "teaching"
        ? "mantenha"
        : "mantenha"
      : streak.weeks === 0
        ? "comece"
        : "ativa";

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-2">
      <div className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3.5 shadow-[var(--surface-shadow)] sm:min-h-0 sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5">
        <Flame className="h-5 w-5 shrink-0 text-[var(--action-red)] sm:h-4 sm:w-4" />
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
            Streak
          </p>
          <p className="mt-0.5 truncate text-base font-semibold text-foreground sm:text-sm">
            <span className="tabular-nums">{streak.weeks}</span>
            <span className="font-normal text-muted-foreground">
              {" "}
              sem. · {streakHint}
            </span>
          </p>
        </div>
      </div>

      <div className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3.5 shadow-[var(--surface-shadow)] sm:min-h-0 sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2.5">
        <Target className="h-5 w-5 shrink-0 text-[var(--action-red)] sm:h-4 sm:w-4" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
            Meta
          </p>
          <div className="mt-0.5 flex items-center gap-2.5 sm:gap-2">
            <p className="text-base font-semibold tabular-nums text-foreground sm:text-sm">
              {weeklyGoal.current}/{weeklyGoal.target}
            </p>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted sm:h-1">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  weeklyGoal.met ? "bg-emerald-500" : "bg-[var(--action-red)]",
                )}
                style={{ width: `${weeklyGoal.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function JourneyMonthlyChart({
  months,
  track,
}: {
  months: MonthBucket[];
  track: JourneyTrack;
}) {
  const max = Math.max(1, ...months.map((m) => m.count));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl sm:p-4">
      <div>
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground sm:text-base sm:tracking-[0.12em]">
          Frequência
        </h2>
        <p className="mt-1 text-sm text-muted-foreground sm:text-xs">
          {track === "teaching" ? "Aulas dadas por mês" : "Treinos por mês"}
        </p>
      </div>

      <div className="mt-6 flex h-32 items-end gap-2.5 sm:mt-5 sm:h-28 sm:gap-2">
        {months.map((month) => {
          const height = Math.max(
            month.count === 0 ? 4 : 8,
            Math.round((month.count / max) * 100),
          );
          return (
            <div
              key={month.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-xs tabular-nums text-muted-foreground sm:text-[10px]">
                {month.count > 0 ? month.count : ""}
              </span>
              <div className="flex h-24 w-full items-end justify-center sm:h-20">
                <div
                  className={cn(
                    "w-full max-w-[32px] rounded-t-md transition-all sm:max-w-[28px]",
                    month.count > 0 ? "bg-[var(--action-red)]" : "bg-muted",
                  )}
                  style={{ height: `${height}%` }}
                  title={`${month.label}: ${month.count}`}
                />
              </div>
              <span className="text-xs text-muted-foreground sm:text-[10px]">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
