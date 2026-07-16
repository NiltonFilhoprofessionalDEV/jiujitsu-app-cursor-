"use server";

import { assertCapability } from "@/lib/permissions/assert";
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

export type DashboardData = {
  metrics: DashboardMetrics;
  recentAttendance: RecentAttendanceItem[];
  recentGraduations: RecentGraduationItem[];
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
