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
    <section className="grid grid-cols-2 gap-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--surface-shadow)]">
        <Flame className="h-4 w-4 shrink-0 text-[var(--action-red)]" />
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Streak
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            <span className="tabular-nums">{streak.weeks}</span>
            <span className="font-normal text-muted-foreground">
              {" "}
              sem. · {streakHint}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--surface-shadow)]">
        <Target className="h-4 w-4 shrink-0 text-[var(--action-red)]" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Meta
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {weeklyGoal.current}/{weeklyGoal.target}
            </p>
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
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
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div>
        <h2 className="font-display text-base tracking-[0.12em] text-foreground">
          Frequência
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {track === "teaching" ? "Aulas dadas por mês" : "Treinos por mês"}
        </p>
      </div>

      <div className="mt-5 flex h-28 items-end gap-2">
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
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {month.count > 0 ? month.count : ""}
              </span>
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t-md transition-all",
                    month.count > 0 ? "bg-[var(--action-red)]" : "bg-muted",
                  )}
                  style={{ height: `${height}%` }}
                  title={`${month.label}: ${month.count}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
