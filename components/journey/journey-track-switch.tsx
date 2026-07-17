import Link from "next/link";
import type { JourneyTrack } from "@/lib/journey/milestones";
import { cn } from "@/lib/utils";

const TRACK_LABELS: Record<JourneyTrack, string> = {
  student: "Como aluno",
  teaching: "Como professor",
};

export function JourneyTrackSwitch({
  track,
  availableTracks,
}: {
  track: JourneyTrack;
  availableTracks: JourneyTrack[];
}) {
  if (availableTracks.length < 2) return null;

  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-[var(--surface-shadow)]">
      {availableTracks.map((option) => (
        <Link
          key={option}
          href={`/journey?mode=${option}`}
          className={cn(
            "rounded-xl px-3 py-2.5 text-center text-sm font-medium transition",
            track === option
              ? "bg-[var(--action-red)] text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {TRACK_LABELS[option]}
        </Link>
      ))}
    </div>
  );
}
