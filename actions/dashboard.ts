"use server";

import { assertCapability } from "@/lib/permissions/assert";
import {
  findNextTraining,
  type ScheduleSlot,
} from "@/lib/classes/next-training";
import { resolveTimezone } from "@/lib/sessions/auto-open";
import { createClient } from "@/lib/supabase/server";

export type DashboardMetrics = {
  activeStudents: number;
  instructors: number;
  classes: number;
  attendanceToday: number;
  attendanceMonth: number;
  newMembersMonth: number;
  graduationsMonth: number;
  inactiveStudents: number;
};

export type RecentAttendanceItem = {
  id: string;
  checked_at: string;
  student_name: string;
  class_name: string;
};

export type RecentGraduationItem = {
  id: string;
  graduated_at: string;
  belt: string;
  degree: number;
  member_name: string;
};

export type OpenSessionBoardItem = {
  id: string;
  classId: string;
  className: string;
  startedAt: string | null;
  presentCount: number;
  pendingCount: number;
};

export type NextClassBoard = {
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  instructorName: string | null;
  openSessionId: string | null;
  isOngoing: boolean;
  dayOffset: number;
} | null;

export type DashboardData = {
  metrics: DashboardMetrics;
  recentAttendance: RecentAttendanceItem[];
  recentGraduations: RecentGraduationItem[];
  openSessions: OpenSessionBoardItem[];
  pendingApprovals: number;
  nextClass: NextClassBoard;
};

export type StatsCharts = {
  studentsByBelt: { belt: string; count: number }[];
  attendanceByMonth: { month: string; count: number }[];
  memberGrowth: { month: string; count: number }[];
  graduationsByYear: { year: string; count: number }[];
};

function startOfDayIso(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function startOfMonthIso(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function yearKey(iso: string): string {
  return String(new Date(iso).getFullYear());
}

async function memberIdsForAcademy(academyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academy_members")
    .select("id")
    .eq("academy_id", academyId);

  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

async function classIdsForAcademy(academyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("academy_id", academyId);

  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

async function sessionIdsForClasses(classIds: string[]): Promise<string[]> {
  if (classIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id")
    .in("class_id", classIds);

  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

export async function getDashboardData(): Promise<DashboardData> {
  const member = await assertCapability("view_dashboard");

  const supabase = await createClient();
  const academyId = member.academy_id;
  const todayStart = startOfDayIso();
  const monthStart = startOfMonthIso();

  const [
    { count: activeStudents },
    { count: instructors },
    { count: classesCount },
    { count: inactiveStudents },
    { count: newMembersMonth },
  ] = await Promise.all([
    supabase
      .from("academy_members")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .eq("role", "student")
      .eq("status", "active"),
    supabase
      .from("academy_members")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .eq("status", "active")
      .in("role", ["instructor", "assistant_instructor"]),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .eq("is_active", true),
    supabase
      .from("academy_members")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .eq("role", "student")
      .eq("status", "inactive"),
    supabase
      .from("academy_members")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .gte("joined_at", monthStart),
  ]);

  const memberIds = await memberIdsForAcademy(academyId);
  const classIds = await classIdsForAcademy(academyId);
  const sessionIds = await sessionIdsForClasses(classIds);

  let attendanceToday = 0;
  let attendanceMonth = 0;
  let graduationsMonth = 0;
  let recentAttendance: RecentAttendanceItem[] = [];
  let recentGraduations: RecentGraduationItem[] = [];

  if (sessionIds.length > 0) {
    const [{ count: todayCount }, { count: monthCount }] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .in("session_id", sessionIds)
        .gte("checked_at", todayStart),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .in("session_id", sessionIds)
        .gte("checked_at", monthStart),
    ]);
    attendanceToday = todayCount ?? 0;
    attendanceMonth = monthCount ?? 0;

    const { data: recentAtt } = await supabase
      .from("attendance_records")
      .select(
        `
        id,
        checked_at,
        academy_members!student_id(profiles(name)),
        class_sessions!session_id(classes(name))
      `,
      )
      .in("session_id", sessionIds)
      .order("checked_at", { ascending: false })
      .limit(8);

    recentAttendance = (recentAtt ?? []).flatMap((row) => {
      const am = row.academy_members as
        | { profiles: { name: string } | { name: string }[] | null }
        | { profiles: { name: string } | { name: string }[] | null }[]
        | null;
      const amOne = Array.isArray(am) ? am[0] : am;
      const profile = amOne?.profiles
        ? Array.isArray(amOne.profiles)
          ? amOne.profiles[0]
          : amOne.profiles
        : null;

      const sessionRel = row.class_sessions as
        | {
            classes:
              | { name: string }
              | { name: string }[]
              | null;
          }
        | {
            classes:
              | { name: string }
              | { name: string }[]
              | null;
          }[]
        | null;
      const session = Array.isArray(sessionRel) ? sessionRel[0] : sessionRel;
      const klass = session?.classes
        ? Array.isArray(session.classes)
          ? session.classes[0]
          : session.classes
        : null;

      return [
        {
          id: row.id as string,
          checked_at: row.checked_at as string,
          student_name: profile?.name ?? "Aluno",
          class_name: klass?.name ?? "Turma",
        },
      ];
    });
  }

  if (memberIds.length > 0) {
    const { count: gradCount } = await supabase
      .from("graduation_history")
      .select("id", { count: "exact", head: true })
      .in("member_id", memberIds)
      .gte("graduated_at", monthStart.slice(0, 10));

    graduationsMonth = gradCount ?? 0;

    const { data: recentGrad } = await supabase
      .from("graduation_history")
      .select(
        `
        id,
        graduated_at,
        belt,
        degree,
        academy_members!member_id(profiles(name))
      `,
      )
      .in("member_id", memberIds)
      .order("graduated_at", { ascending: false })
      .limit(8);

    recentGraduations = (recentGrad ?? []).flatMap((row) => {
      const am = row.academy_members as
        | { profiles: { name: string } | { name: string }[] | null }
        | { profiles: { name: string } | { name: string }[] | null }[]
        | null;
      const amOne = Array.isArray(am) ? am[0] : am;
      const profile = amOne?.profiles
        ? Array.isArray(amOne.profiles)
          ? amOne.profiles[0]
          : amOne.profiles
        : null;

      return [
        {
          id: row.id as string,
          graduated_at: row.graduated_at as string,
          belt: row.belt as string,
          degree: row.degree as number,
          member_name: profile?.name ?? "Membro",
        },
      ];
    });
  }

  // --- Ops board: open sessions, pending queue, next class ---
  let openSessions: OpenSessionBoardItem[] = [];
  let pendingApprovals = 0;
  let nextClass: NextClassBoard = null;

  const { data: openRows } = await supabase
    .from("class_sessions")
    .select(
      `
      id,
      class_id,
      started_at,
      classes!inner(id, name, academy_id)
    `,
    )
    .eq("status", "open")
    .eq("classes.academy_id", academyId)
    .order("started_at", { ascending: false });

  const openList = (openRows ?? []).flatMap((row) => {
    const klass = row.classes as
      | { id: string; name: string; academy_id: string }
      | { id: string; name: string; academy_id: string }[]
      | null;
    const one = Array.isArray(klass) ? klass[0] : klass;
    if (!one || one.academy_id !== academyId) return [];
    return [
      {
        id: row.id as string,
        classId: row.class_id as string,
        className: one.name ?? "Turma",
        startedAt: (row.started_at as string | null) ?? null,
      },
    ];
  });

  if (openList.length > 0) {
    const openIds = openList.map((s) => s.id);
    const [{ data: presentRows }, { data: pendingRows }] = await Promise.all([
      supabase
        .from("attendance_records")
        .select("session_id")
        .in("session_id", openIds),
      supabase
        .from("attendance_requests")
        .select("session_id")
        .eq("status", "pending")
        .in("session_id", openIds),
    ]);

    const presentMap = new Map<string, number>();
    for (const row of presentRows ?? []) {
      const sid = row.session_id as string;
      presentMap.set(sid, (presentMap.get(sid) ?? 0) + 1);
    }
    const pendingMap = new Map<string, number>();
    for (const row of pendingRows ?? []) {
      const sid = row.session_id as string;
      pendingMap.set(sid, (pendingMap.get(sid) ?? 0) + 1);
    }

    openSessions = openList.map((s) => ({
      ...s,
      presentCount: presentMap.get(s.id) ?? 0,
      pendingCount: pendingMap.get(s.id) ?? 0,
    }));
    pendingApprovals = openSessions.reduce((sum, s) => sum + s.pendingCount, 0);
  }

  const [{ data: academyRow }, { data: classRows }] = await Promise.all([
    supabase
      .from("academies")
      .select("timezone")
      .eq("id", academyId)
      .maybeSingle(),
    supabase
      .from("classes")
      .select(
        `
        id,
        name,
        is_active,
        default_instructor_id,
        class_schedules(id, weekday, start_time, end_time)
      `,
      )
      .eq("academy_id", academyId)
      .eq("is_active", true),
  ]);

  const timeZone = resolveTimezone(
    null,
    (academyRow?.timezone as string | null) ?? null,
  );
  const now = new Date();
  const openByClassId = new Map(
    openSessions.map((s) => [s.classId, s.id] as const),
  );

  type Candidate = {
    classId: string;
    className: string;
    instructorId: string | null;
    schedule: ScheduleSlot;
  };

  const candidates: Candidate[] = [];
  for (const row of classRows ?? []) {
    const schedules = (row.class_schedules as ScheduleSlot[] | null) ?? [];
    for (const schedule of schedules) {
      candidates.push({
        classId: row.id as string,
        className: row.name as string,
        instructorId: (row.default_instructor_id as string | null) ?? null,
        schedule: {
          id: schedule.id,
          weekday: Number(schedule.weekday),
          start_time: String(schedule.start_time),
          end_time: String(schedule.end_time),
        },
      });
    }
  }

  type Scored = {
    classId: string;
    className: string;
    instructorId: string | null;
    startTime: string;
    endTime: string;
    isOngoing: boolean;
    dayOffset: number;
  };

  const scored: Scored[] = [];
  for (const candidate of candidates) {
    const next = findNextTraining([candidate.schedule], now, timeZone);
    if (!next) continue;
    scored.push({
      classId: candidate.classId,
      className: candidate.className,
      instructorId: candidate.instructorId,
      startTime: next.startTime,
      endTime: next.endTime,
      isOngoing: next.isOngoing,
      dayOffset: next.dayOffset,
    });
  }

  scored.sort((a, b) => {
    if (a.isOngoing !== b.isOngoing) return a.isOngoing ? -1 : 1;
    if (a.dayOffset !== b.dayOffset) return a.dayOffset - b.dayOffset;
    return a.startTime.localeCompare(b.startTime);
  });

  const top = scored[0] ?? null;
  if (top) {
    let instructorName: string | null = null;
    if (top.instructorId) {
      const { data: instructor } = await supabase
        .from("academy_members")
        .select("profiles(name)")
        .eq("id", top.instructorId)
        .maybeSingle();
      const profile = instructor?.profiles as
        | { name: string }
        | { name: string }[]
        | null
        | undefined;
      const one = Array.isArray(profile) ? profile[0] : profile;
      instructorName = one?.name ?? null;
    }
    nextClass = {
      classId: top.classId,
      className: top.className,
      startTime: top.startTime,
      endTime: top.endTime,
      instructorName,
      openSessionId: openByClassId.get(top.classId) ?? null,
      isOngoing: top.isOngoing,
      dayOffset: top.dayOffset,
    };
  }

  return {
    metrics: {
      activeStudents: activeStudents ?? 0,
      instructors: instructors ?? 0,
      classes: classesCount ?? 0,
      attendanceToday,
      attendanceMonth,
      newMembersMonth: newMembersMonth ?? 0,
      graduationsMonth,
      inactiveStudents: inactiveStudents ?? 0,
    },
    recentAttendance,
    recentGraduations,
    openSessions,
    pendingApprovals,
    nextClass,
  };
}

export async function getStatsCharts(): Promise<StatsCharts> {
  const member = await assertCapability("view_dashboard");
  const supabase = await createClient();
  const academyId = member.academy_id;

  const { data: members, error: membersError } = await supabase
    .from("academy_members")
    .select("id, current_belt, joined_at, role, status")
    .eq("academy_id", academyId);

  if (membersError) throw membersError;

  const rows = members ?? [];
  const beltMap = new Map<string, number>();
  const growthMap = new Map<string, number>();

  for (const m of rows) {
    if (m.role === "student" && m.status === "active") {
      const belt = (m.current_belt as string | null) ?? "Sem faixa";
      beltMap.set(belt, (beltMap.get(belt) ?? 0) + 1);
    }
    if (m.joined_at) {
      const key = monthKey(m.joined_at as string);
      growthMap.set(key, (growthMap.get(key) ?? 0) + 1);
    }
  }

  const memberIds = rows.map((r) => r.id as string);
  const classIds = await classIdsForAcademy(academyId);
  const sessionIds = await sessionIdsForClasses(classIds);

  const attendanceMap = new Map<string, number>();
  if (sessionIds.length > 0) {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("checked_at")
      .in("session_id", sessionIds)
      .gte("checked_at", yearAgo.toISOString());

    for (const row of attendance ?? []) {
      const key = monthKey(row.checked_at as string);
      attendanceMap.set(key, (attendanceMap.get(key) ?? 0) + 1);
    }
  }

  const gradYearMap = new Map<string, number>();
  if (memberIds.length > 0) {
    const { data: grads } = await supabase
      .from("graduation_history")
      .select("graduated_at")
      .in("member_id", memberIds);

    for (const row of grads ?? []) {
      const key = yearKey(`${row.graduated_at as string}T12:00:00`);
      gradYearMap.set(key, (gradYearMap.get(key) ?? 0) + 1);
    }
  }

  const sortKeys = (a: string, b: string) => a.localeCompare(b);

  return {
    studentsByBelt: [...beltMap.entries()]
      .map(([belt, count]) => ({ belt, count }))
      .sort((a, b) => b.count - a.count),
    attendanceByMonth: [...attendanceMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => sortKeys(a.month, b.month)),
    memberGrowth: [...growthMap.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => sortKeys(a.month, b.month)),
    graduationsByYear: [...gradYearMap.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => sortKeys(a.year, b.year)),
  };
}
