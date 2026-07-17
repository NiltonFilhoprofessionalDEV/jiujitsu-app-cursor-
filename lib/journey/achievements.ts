import {
  milestonesForTrack,
  type JourneyTrack,
} from "@/lib/journey/milestones";

export function codesToUnlock(
  classCount: number,
  alreadyUnlocked: string[],
  track: JourneyTrack = "student",
): string[] {
  const have = new Set(alreadyUnlocked);
  return milestonesForTrack(track)
    .filter((m) => classCount >= m.threshold && !have.has(m.code))
    .map((m) => m.code);
}
