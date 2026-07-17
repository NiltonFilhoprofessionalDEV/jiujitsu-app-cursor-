"use client";

import { Lock } from "lucide-react";
import {
  milestonesForTrack,
  type JourneyMilestone,
  type JourneyTrack,
} from "@/lib/journey/milestones";
import { TrophyImage } from "@/components/journey/trophy-image";
import { cn } from "@/lib/utils";

export function TrophyGrid({
  track,
  unlockedCodes,
  recentUnlockedCodes,
  onPreview,
}: {
  track: JourneyTrack;
  unlockedCodes: string[];
  recentUnlockedCodes: string[];
  onPreview?: (milestone: JourneyMilestone) => void;
}) {
  const unlockedSet = new Set(unlockedCodes);
  const recentSet = new Set(recentUnlockedCodes);
  const milestones = milestonesForTrack(track);
  const canPreview = Boolean(onPreview);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-base tracking-[0.12em] text-foreground">
          Troféus
        </h2>
        {canPreview ? (
          <p className="text-[10px] text-muted-foreground">Toque para ver</p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {milestones.map((milestone) => {
          const unlocked = unlockedSet.has(milestone.code);
          const recent = unlocked && recentSet.has(milestone.code);

          const content = (
            <>
              <div className="relative">
                <TrophyImage
                  material={milestone.material}
                  unlocked={unlocked || canPreview}
                  size="sm"
                />
                {!unlocked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border">
                    <Lock className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    unlocked || canPreview
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {milestone.materialLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {milestone.label}
                </p>
              </div>
            </>
          );

          const shellClass = cn(
            "relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-[var(--surface-shadow)] backdrop-blur-xl transition",
            !unlocked && !canPreview && "opacity-70",
            canPreview && "active:scale-[0.98] hover:border-foreground/25",
            recent && "animate-pulse ring-2 ring-[var(--action-red)]",
          );

          if (canPreview && onPreview) {
            return (
              <button
                key={milestone.code}
                type="button"
                onClick={() => onPreview(milestone)}
                className={shellClass}
                style={
                  recent
                    ? { boxShadow: "0 0 22px var(--fab-glow)" }
                    : undefined
                }
                aria-label={`Pré-visualizar ${milestone.materialLabel}`}
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
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
