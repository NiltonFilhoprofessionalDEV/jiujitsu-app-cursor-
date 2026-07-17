"use client";

import { useCallback, useState } from "react";
import { TrophyGrid } from "@/components/journey/trophy-grid";
import {
  TrophyCelebrationOverlay,
  type PreviewableTrophy,
} from "@/components/journey/trophy-celebration";
import {
  milestonesForTrack,
  trophyTitle,
  type JourneyMilestone,
  type JourneyTrack,
} from "@/lib/journey/milestones";

function toPreviewItem(
  milestone: JourneyMilestone,
  suffix = Date.now(),
): PreviewableTrophy {
  return {
    id: `preview-${milestone.code}-${suffix}`,
    code: milestone.code,
    material: milestone.material,
    materialLabel: milestone.materialLabel,
    label: milestone.label,
    title: trophyTitle(milestone),
  };
}

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

  const previewOne = useCallback((milestone: JourneyMilestone) => {
    setQueue([toPreviewItem(milestone)]);
  }, []);

  const previewAll = useCallback(() => {
    const now = Date.now();
    setQueue(
      milestonesForTrack(track).map((milestone, index) =>
        toPreviewItem(milestone, now + index),
      ),
    );
  }, [track]);

  const current = queue[0] ?? null;

  return (
    <div className="space-y-3">
      <TrophyGrid
        track={track}
        unlockedCodes={unlockedCodes}
        recentUnlockedCodes={recentUnlockedCodes}
        onPreview={previewOne}
      />

      <button
        type="button"
        onClick={previewAll}
        className="w-full rounded-xl border border-dashed border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)] px-4 py-3 text-sm font-medium text-foreground transition hover:brightness-[1.03]"
      >
        Pré-visualizar celebração dos troféus
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        Toque em um troféu para ver só ele · ou use o botão para a sequência
      </p>

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
