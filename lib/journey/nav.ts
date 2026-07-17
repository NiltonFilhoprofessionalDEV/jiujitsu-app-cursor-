import { can } from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/types/domain";
import type { JourneyTrack } from "@/lib/journey/milestones";

export type ProgressNavItem = {
  href: string;
  label: string;
  icon: "stats" | "journey";
};

export function primaryProgressNavItem(
  role: MemberRole,
): ProgressNavItem | null {
  if (
    can(role, "view_own_journey") ||
    can(role, "view_teaching_journey")
  ) {
    return { href: "/journey", label: "Jornada", icon: "journey" };
  }
  if (can(role, "view_dashboard")) {
    return { href: "/stats", label: "Stats", icon: "stats" };
  }
  return null;
}

/** First screen after login / opening the app. */
export function defaultAppHomePath(role: MemberRole): string {
  if (
    can(role, "view_own_journey") &&
    !can(role, "view_teaching_journey")
  ) {
    return "/journey";
  }
  return "/home";
}

export function canAccessJourney(role: MemberRole): boolean {
  return (
    can(role, "view_own_journey") || can(role, "view_teaching_journey")
  );
}

export function availableJourneyTracks(role: MemberRole): JourneyTrack[] {
  const tracks: JourneyTrack[] = [];
  if (can(role, "view_own_journey")) tracks.push("student");
  if (can(role, "view_teaching_journey")) tracks.push("teaching");
  return tracks;
}

export function defaultJourneyTrack(role: MemberRole): JourneyTrack {
  const tracks = availableJourneyTracks(role);
  if (tracks.includes("teaching") && !tracks.includes("student")) {
    return "teaching";
  }
  if (tracks.includes("teaching") && tracks.includes("student")) {
    return "teaching";
  }
  return "student";
}

export function resolveJourneyTrack(
  role: MemberRole,
  requested: string | null | undefined,
): JourneyTrack {
  const tracks = availableJourneyTracks(role);
  if (requested === "student" || requested === "teaching") {
    if (tracks.includes(requested)) return requested;
  }
  return defaultJourneyTrack(role);
}
