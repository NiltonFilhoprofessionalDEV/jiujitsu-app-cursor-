import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  listAcademyStudentsForRoster,
  listClassMembers,
} from "@/actions/class-members";
import { getClass } from "@/actions/classes";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { ClassSchedulesManager } from "../class-schedules-manager";
import { OpenSessionButton } from "../open-session-button";
import { ClassRoster } from "./class-roster";

type Params = Promise<{ id: string }>;

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
  const canOpen = can(membership.role, "open_session") && klass.is_active;

  const rosterData = canManage
    ? await Promise.all([
        listClassMembers(klass.id),
        listAcademyStudentsForRoster(),
      ])
    : null;

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
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
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

      {(klass.minimum_age != null ||
        klass.maximum_age != null ||
        klass.minimum_belt ||
        klass.maximum_belt) && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground backdrop-blur-xl">
          {klass.minimum_age != null || klass.maximum_age != null ? (
            <p>
              Idade:{" "}
              {klass.minimum_age != null ? `${klass.minimum_age}` : "—"}
              {" – "}
              {klass.maximum_age != null ? `${klass.maximum_age}` : "—"}
            </p>
          ) : null}
          {klass.minimum_belt || klass.maximum_belt ? (
            <p className="mt-1">
              Faixa: {klass.minimum_belt ?? "qualquer"} –{" "}
              {klass.maximum_belt ?? "qualquer"}
            </p>
          ) : null}
        </div>
      )}

      {canOpen ? <OpenSessionButton classId={klass.id} /> : null}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-foreground">
          Horários semanais
        </h2>
        <ClassSchedulesManager
          classId={klass.id}
          schedules={klass.schedules ?? []}
          canManage={canManage}
        />
      </section>

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
