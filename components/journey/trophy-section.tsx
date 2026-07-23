"use client";

import { useCallback, useState } from "react";
import { TrophyGrid } from "@/components/journey/trophy-grid";
import {
  TrophyCelebrationOverlay,
  type PreviewableTrophy,
} from "@/components/journey/trophy-celebration";
import {
  findMilestoneByCode,
  trophyTitle,
  type JourneyTrack,
} from "@/lib/journey/milestones";

export function TrophySection({
  track,
  unlockedCodes,
  recentUnlockedCodes,
}: {
  track: JourneyTrack;
  unlockedCodes: string[];
  recentUnlockedCodes: string[];
}) {
  const [queue, setQueue] = useState<PreviewableTrophy[]>([]);

  const openUnlocked = useCallback((code: string) => {
    const milestone = findMilestoneByCode(code);
    if (!milestone) return;
    setQueue([
      {
        id: `view-${milestone.code}-${Date.now()}`,
        code: milestone.code,
        material: milestone.material,
        materialLabel: milestone.materialLabel,
        label: milestone.label,
        title: trophyTitle(milestone),
      },
    ]);
  }, []);

  const current = queue[0] ?? null;

  return (
    <div className="space-y-3">
      <TrophyGrid
        track={track}
        unlockedCodes={unlockedCodes}
        recentUnlockedCodes={recentUnlockedCodes}
        onOpenUnlocked={openUnlocked}
      />

      {current ? (
        <TrophyCelebrationOverlay
          item={current}
          persist={false}
          onDismiss={() => setQueue((q) => q.slice(1))}
        />
      ) : null}
    </div>
  );
}
