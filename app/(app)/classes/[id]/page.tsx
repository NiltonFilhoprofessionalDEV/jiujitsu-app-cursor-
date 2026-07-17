import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  listAcademyStudentsForRoster,
  listClassMembers,
} from "@/actions/class-members";
import {
  getClass,
  listAutoOpenInstructors,
  listClasses,
  listScheduleDayOverrides,
  type ScheduleDayOverrideRow,
} from "@/actions/classes";
import { resolveTimezone } from "@/lib/sessions/auto-open";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { createClient } from "@/lib/supabase/server";
import { ClassAutomationPanel } from "../class-automation-panel";
import { ClassDayOverrides } from "../class-day-overrides";
import { ClassRequirementsCard } from "../class-requirements-card";
import { ClassScheduleBoard } from "../class-schedule-board";
import { OpenSessionButton } from "../open-session-button";
import { ClassRoster } from "./class-roster";

type Params = Promise<{ id: string }>;

async function resolveClassTimezone(input: {
  academyId: string;
  unitId: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const { data: academy } = await supabase
    .from("academies")
    .select("timezone")
    .eq("id", input.academyId)
    .maybeSingle();

  let unitTimezone: string | null = null;
  if (input.unitId) {
    const { data: unit } = await supabase
      .from("academy_units")
      .select("timezone")
      .eq("id", input.unitId)
      .maybeSingle();
    unitTimezone = (unit?.timezone as string | null) ?? null;
  }

  return resolveTimezone(unitTimezone, academy?.timezone as string | null);
}

async function safeListOverrides(
  classId: string,
): Promise<ScheduleDayOverrideRow[]> {
  try {
    return await listScheduleDayOverrides(classId);
  } catch {
    return [];
  }
}

export default async function ClassDetailPage({
  params,
}: {
  params: Params;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const { id } = await params;

  if (membership.role === "student") {
    redirect("/classes");
  }

  let klass;
  try {
    klass = await getClass(id);
  } catch {
    redirect("/select-academy");
  }

  if (!klass) {
    notFound();
  }

  const canManage = can(membership.role, "manage_classes");
  const canConfigureAuto =
    can(membership.role, "manage_classes") ||
    can(membership.role, "open_session");
  const canOpen = can(membership.role, "open_session") && klass.is_active;

  const [instructors, overrides, siblings, timeZone, rosterData] =
    await Promise.all([
      canConfigureAuto ? listAutoOpenInstructors() : Promise.resolve([]),
      canConfigureAuto ? safeListOverrides(klass.id) : Promise.resolve([]),
      canManage ? listClasses() : Promise.resolve([]),
      resolveClassTimezone({
        academyId: klass.academy_id,
        unitId: klass.unit_id,
      }),
      canManage
        ? Promise.all([
            listClassMembers(klass.id),
            listAcademyStudentsForRoster(),
          ])
        : Promise.resolve(null),
    ]);

  const siblingOptions = siblings
    .filter((row) => row.id !== klass.id)
    .map((row) => ({
      id: row.id,
      name: row.name,
      scheduleCount: row.schedules?.length ?? 0,
    }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/classes"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Turmas
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
              {klass.name}
            </h1>
            {klass.description ? (
              <p className="mt-1 text-sm text-[var(--bjj-muted)]">
                {klass.description}
              </p>
            ) : null}
          </div>
          <span
            className={
              klass.is_active
                ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            }
          >
            {klass.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
      </header>

      <ClassRequirementsCard
        minimumAge={klass.minimum_age}
        maximumAge={klass.maximum_age}
        minimumBelt={klass.minimum_belt}
        maximumBelt={klass.maximum_belt}
      />

      {canOpen ? <OpenSessionButton classId={klass.id} /> : null}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <div>
          <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
            Horários
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {canManage
              ? "Quando a turma treina. Os alunos veem essa grade em Turmas."
              : "Grade semanal desta turma."}
          </p>
        </div>
        <ClassScheduleBoard
          classId={klass.id}
          schedules={klass.schedules ?? []}
          canManage={canManage}
          siblingClasses={siblingOptions}
        />
      </section>

      {canConfigureAuto ? (
        <ClassAutomationPanel
          classId={klass.id}
          schedules={klass.schedules ?? []}
          defaultInstructorId={klass.default_instructor_id}
          instructors={instructors}
          canConfigure={canConfigureAuto}
          timeZone={timeZone}
          overrides={overrides}
        />
      ) : null}

      {canConfigureAuto ? (
        <ClassDayOverrides
          classId={klass.id}
          schedules={klass.schedules ?? []}
          overrides={overrides}
          instructors={instructors}
          canConfigure={canConfigureAuto}
        />
      ) : null}

      {rosterData ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-foreground">
            Alunos da turma
          </h2>
          <ClassRoster
            classId={klass.id}
            initialMembers={rosterData[0]}
            students={rosterData[1]}
          />
        </section>
      ) : null}
    </div>
  );
}
