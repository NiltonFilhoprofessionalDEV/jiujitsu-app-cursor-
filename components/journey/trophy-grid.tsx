"use client";

import { Lock } from "lucide-react";
import {
  milestonesForTrack,
  type JourneyTrack,
} from "@/lib/journey/milestones";
import { TrophyImage } from "@/components/journey/trophy-image";
import { cn } from "@/lib/utils";

export function TrophyGrid({
  track,
  unlockedCodes,
  recentUnlockedCodes,
  onOpenUnlocked,
}: {
  track: JourneyTrack;
  unlockedCodes: string[];
  recentUnlockedCodes: string[];
  /** Only called for trophies the member already unlocked */
  onOpenUnlocked?: (code: string) => void;
}) {
  const unlockedSet = new Set(unlockedCodes);
  const recentSet = new Set(recentUnlockedCodes);
  const milestones = milestonesForTrack(track);

  return (
    <section className="space-y-3.5 sm:space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground sm:text-base sm:tracking-[0.12em]">
          Troféus
        </h2>
        <p className="text-xs text-muted-foreground sm:text-[10px]">
          Só conquistas liberadas
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-2">
        {milestones.map((milestone) => {
          const unlocked = unlockedSet.has(milestone.code);
          const recent = unlocked && recentSet.has(milestone.code);

          const content = (
            <>
              <div className="relative">
                <TrophyImage
                  material={milestone.material}
                  unlocked={unlocked}
                  size="md"
                />
                {!unlocked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border sm:h-5 sm:w-5">
                    <Lock className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight sm:text-xs",
                    unlocked ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {milestone.materialLabel}
                </p>
                <p className="text-xs leading-snug text-muted-foreground sm:text-[10px]">
                  {unlocked ? milestone.label : "Bloqueado"}
                </p>
              </div>
            </>
          );

          const shellClass = cn(
            "relative flex min-h-[8.5rem] flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center shadow-[var(--surface-shadow)] backdrop-blur-xl transition sm:min-h-0 sm:gap-1.5 sm:p-3",
            !unlocked && "opacity-70",
            unlocked &&
              onOpenUnlocked &&
              "active:scale-[0.98] hover:border-foreground/25",
            recent && "animate-pulse ring-2 ring-[var(--action-red)]",
          );

          if (unlocked && onOpenUnlocked) {
            return (
              <button
                key={milestone.code}
                type="button"
                onClick={() => onOpenUnlocked(milestone.code)}
                className={shellClass}
                style={
                  recent
                    ? { boxShadow: "0 0 22px var(--fab-glow)" }
                    : undefined
                }
                aria-label={`Ver ${milestone.materialLabel}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={milestone.code}
              className={shellClass}
              style={
                recent
                  ? { boxShadow: "0 0 22px var(--fab-glow)" }
                  : undefined
              }
              aria-label={
                unlocked
                  ? milestone.materialLabel
                  : `${milestone.materialLabel} bloqueado`
              }
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
