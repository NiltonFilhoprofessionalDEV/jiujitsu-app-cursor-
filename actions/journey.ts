"use server";

import { codesToUnlock } from "@/lib/journey/achievements";
import {
  ALL_MILESTONES,
  findMilestoneByCode,
  milestonesForTrack,
  trophyTitle,
  type JourneyTrack,
} from "@/lib/journey/milestones";
import {
  availableJourneyTracks,
  canAccessJourney,
  resolveJourneyTrack,
} from "@/lib/journey/nav";
import {
  DEFAULT_WEEKLY_GOAL_STUDENT,
  DEFAULT_WEEKLY_GOAL_TEACHING,
  computeMonthlyHistory,
  computeWeekStreak,
  computeWeeklyGoal,
  type MonthBucket,
  type StreakStats,
  type WeeklyGoalProgress,
} from "@/lib/journey/habits";
import {
  buildJourneyTimeline,
  type TimelineEvent,
} from "@/lib/journey/timeline";
import {
  assertCan,
  getActiveMembership,
  PermissionError,
} from "@/lib/permissions/assert";
import { resolveTimezone } from "@/lib/sessions/auto-open";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademy } from "@/actions/academies";

const RECENT_UNLOCK_WINDOW_MS = 24 * 60 * 60 * 1000;
const CELEBRATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const MILESTONE_NOTIFY_BY_CODE: Record<string, string> = Object.fromEntries(
  ALL_MILESTONES.map((m) => [m.code, `${trophyTitle(m)} (${m.label})`]),
);

const MILESTONE_TIMELINE_BY_CODE: Record<string, string> = Object.fromEntries(
  ALL_MILESTONES.map((m) => [m.code, trophyTitle(m)]),
);

export type JourneyData = {
  track: JourneyTrack;
  availableTracks: JourneyTrack[];
  classCount: number;
  countLabel: string;
  currentBelt: string | null;
  currentDegree: number | null;
  joinedAt: string | null;
  unlockedCodes: string[];
  recentUnlockedCodes: string[];
  timeline: TimelineEvent[];
  streak: StreakStats;
  weeklyGoal: WeeklyGoalProgress;
  monthlyHistory: MonthBucket[];
};

export async function unlockAchievementsIfNeeded(input: {
  academyId: string;
  memberId: string;
  profileId: string;
  track?: JourneyTrack;
}): Promise<string[]> {
  const track = input.track ?? "student";

  try {
    const admin = createAdminClient();

    let classCount = 0;
    if (track === "student") {
      const { count, error: countError } = await admin
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("student_id", input.memberId);
      if (countError) return [];
      classCount = count ?? 0;
    } else {
      const { count, error: countError } = await admin
        .from("class_sessions")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", input.memberId)
        .eq("status", "finished");
      if (countError) return [];
      classCount = count ?? 0;
    }

    const { data: existing, error: existingError } = await admin
      .from("member_achievements")
      .select("code")
      .eq("member_id", input.memberId);

    if (existingError) return [];

    const already = (existing ?? []).map((row) => row.code as string);
    const toUnlock = codesToUnlock(classCount, already, track);
    if (toUnlock.length === 0) return [];

    const rows = toUnlock.map((code) => ({
      academy_id: input.academyId,
      member_id: input.memberId,
      code,
    }));

    const { error: insertError } = await admin
      .from("member_achievements")
      .insert(rows);

    if (insertError) return [];

    for (const code of toUnlock) {
      const label = MILESTONE_NOTIFY_BY_CODE[code] ?? code;
      await admin.rpc("notify_profile", {
        p_profile_id: input.profileId,
        p_title: "Novo troféu!",
        p_description: `Você conquistou: ${label}.`,
      });
    }

    return toUnlock;
  } catch {
    return [];
  }
}

export async function getJourneyData(
  requestedTrack?: string | null,
): Promise<JourneyData> {
  const membership = await getActiveMembership();
  if (!canAccessJourney(membership.role)) {
    throw new PermissionError(membership.role, "view_own_journey");
  }

  const track = resolveJourneyTrack(membership.role, requestedTrack);
  if (track === "student") {
    assertCan(membership.role, "view_own_journey");
  } else {
    assertCan(membership.role, "view_teaching_journey");
  }

  const supabase = await createClient();
  const trackMilestones = milestonesForTrack(track);
  const trackCodes = new Set(trackMilestones.map((m) => m.code));

  let classCount = 0;
  let activityDates: string[] = [];

  if (track === "student") {
    const { count, error } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("student_id", membership.id);
    if (error) throw error;
    classCount = count ?? 0;

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("class_sessions!inner(date)")
      .eq("student_id", membership.id);
    if (attendanceError) throw attendanceError;

    activityDates = (attendanceRows ?? []).flatMap((row) => {
      const session = row.class_sessions as
        | { date: string }
        | { date: string }[]
        | null;
      if (!session) return [];
      const date = Array.isArray(session) ? session[0]?.date : session.date;
      return date ? [date as string] : [];
    });
  } else {
    const { data: taughtRows, error } = await supabase
      .from("class_sessions")
      .select("id, date")
      .eq("instructor_id", membership.id)
      .eq("status", "finished");
    if (error) throw error;
    classCount = taughtRows?.length ?? 0;
    activityDates = (taughtRows ?? []).map((row) => row.date as string);
  }

  const academy = await getActiveAcademy();
  const timeZone = resolveTimezone(null, academy?.timezone);
  const now = new Date();
  const weeklyTarget =
    track === "teaching"
      ? DEFAULT_WEEKLY_GOAL_TEACHING
      : DEFAULT_WEEKLY_GOAL_STUDENT;
  const streak = computeWeekStreak(activityDates, now, timeZone);
  const weeklyGoal = computeWeeklyGoal(
    activityDates,
    now,
    timeZone,
    weeklyTarget,
  );
  const monthlyHistory = computeMonthlyHistory(activityDates, now, timeZone);

  const { data: member, error: memberError } = await supabase
    .from("academy_members")
    .select("current_belt, current_degree, joined_at")
    .eq("id", membership.id)
    .maybeSingle();

  if (memberError) throw memberError;

  await unlockAchievementsIfNeeded({
    academyId: membership.academy_id,
    memberId: membership.id,
    profileId: membership.profile_id,
    track,
  });

  const { data: achievements, error: achievementsError } = await supabase
    .from("member_achievements")
    .select("id, code, unlocked_at")
    .eq("member_id", membership.id);

  if (achievementsError) throw achievementsError;

  const { data: graduations, error: graduationsError } = await supabase
    .from("graduation_history")
    .select("id, belt, degree, graduated_at, notes")
    .eq("member_id", membership.id)
    .order("graduated_at", { ascending: false });

  if (graduationsError) throw graduationsError;

  const achievementRows = (achievements ?? [])
    .map((row) => ({
      id: row.id as string,
      code: row.code as string,
      unlocked_at: row.unlocked_at as string,
    }))
    .filter((row) => trackCodes.has(row.code));

  const graduationRows =
    track === "student"
      ? (graduations ?? []).map((row) => ({
          id: row.id as string,
          belt: row.belt as string,
          degree: row.degree as number,
          graduated_at: row.graduated_at as string,
          notes: (row.notes as string | null) ?? null,
        }))
      : [];

  const timeline = buildJourneyTimeline({
    joinedAt: (member?.joined_at as string | null) ?? null,
    graduations: graduationRows,
    achievements: achievementRows,
    milestoneLabels: MILESTONE_TIMELINE_BY_CODE,
  });

  const recentCutoff = Date.now() - RECENT_UNLOCK_WINDOW_MS;
  const recentUnlockedCodes = achievementRows
    .filter((a) => new Date(a.unlocked_at).getTime() >= recentCutoff)
    .map((a) => a.code);

  return {
    track,
    availableTracks: availableJourneyTracks(membership.role),
    classCount,
    countLabel: track === "teaching" ? "Aulas dadas" : "Aulas treinadas",
    currentBelt: (member?.current_belt as string | null) ?? null,
    currentDegree: (member?.current_degree as number | null) ?? null,
    joinedAt: (member?.joined_at as string | null) ?? null,
    unlockedCodes: achievementRows.map((a) => a.code),
    recentUnlockedCodes,
    timeline,
    streak,
    weeklyGoal,
    monthlyHistory,
  };
}

export type TrophyCelebrationItem = {
  id: string;
  code: string;
  material: (typeof ALL_MILESTONES)[number]["material"];
  materialLabel: string;
  label: string;
  title: string;
};

export async function getPendingTrophyCelebrations(): Promise<{
  memberId: string;
  items: TrophyCelebrationItem[];
} | null> {
  try {
    const membership = await getActiveMembership();
    if (!canAccessJourney(membership.role)) return null;

    const supabase = await createClient();
    const since = new Date(Date.now() - CELEBRATION_WINDOW_MS).toISOString();

    const { data, error } = await supabase
      .from("member_achievements")
      .select("id, code, unlocked_at")
      .eq("member_id", membership.id)
      .gte("unlocked_at", since)
      .order("unlocked_at", { ascending: true });

    if (error) return null;

    const items: TrophyCelebrationItem[] = [];
    for (const row of data ?? []) {
      const milestone = findMilestoneByCode(row.code as string);
      if (!milestone) continue;
      items.push({
        id: row.id as string,
        code: milestone.code,
        material: milestone.material,
        materialLabel: milestone.materialLabel,
        label: milestone.label,
        title: trophyTitle(milestone),
      });
    }

    return { memberId: membership.id, items };
  } catch {
    return null;
  }
}
