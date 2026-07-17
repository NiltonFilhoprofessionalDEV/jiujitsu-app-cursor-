import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  listManualAttendanceOptions,
  listPendingRequests,
  listSessionPresent,
} from "@/actions/attendance";
import { getSession } from "@/actions/sessions";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { CloseSessionButton } from "../close-session-button";
import { PendingRequestsList } from "../pending-requests-list";
import {
  ManualAttendanceForm,
  SessionPresentList,
} from "../session-present-panel";

type Params = Promise<{ id: string }>;

export default async function SessionPage({ params }: { params: Params }) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const { id } = await params;

  let session;
  try {
    session = await getSession(id);
  } catch {
    redirect("/select-academy");
  }

  if (!session) {
    notFound();
  }

  const canApprove = can(membership.role, "approve_attendance");
  const canClose = can(membership.role, "close_session");
  const canManual = can(membership.role, "manual_attendance");

  if (!canApprove && !canClose && !canManual) {
    redirect("/checkin");
  }

  const [pending, present, manualOptions] = await Promise.all([
    canApprove
      ? listPendingRequests(session.id).catch(() => [])
      : Promise.resolve([]),
    listSessionPresent(session.id).catch(() => []),
    canManual && session.status === "open"
      ? listManualAttendanceOptions(session.id).catch(() => [])
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href="/checkin"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Fila de presença
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
              {session.class_name ?? "Aula"}
            </h1>
            <p className="mt-1 text-sm text-[var(--bjj-muted)]">
              {session.date}
              {session.started_at
                ? ` · aberta às ${new Date(session.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </p>
          </div>
          <span
            className={
              session.status === "open"
                ? "shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                : "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            }
          >
            {session.status === "open" ? "Aberta" : session.status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div
          className={
            pending.length > 0
              ? "rounded-2xl border border-[var(--checkin-queue-border)] bg-[var(--checkin-queue-wash)] px-4 py-3"
              : "rounded-2xl border border-border bg-[var(--checkin-metric-muted)] px-4 py-3"
          }
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Na fila
          </p>
          <p className="mt-1 font-display text-3xl tabular-nums leading-none text-foreground">
            {pending.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--checkin-present-border)] bg-[var(--checkin-present-wash)] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            No tatame
          </p>
          <p className="mt-1 font-display text-3xl tabular-nums leading-none text-foreground">
            {present.length}
          </p>
        </div>
      </div>

      {canApprove ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
              Fila
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {pending.length}
            </span>
          </div>
          <PendingRequestsList
            sessionId={session.id}
            initialRequests={pending}
          />
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
            Presentes
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {present.length}
          </span>
        </div>
        <SessionPresentList present={present} />
      </section>

      {canManual && session.status === "open" ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
          <div>
            <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
              Presença manual
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Marque quem treinou sem pedir check-in no app.
            </p>
          </div>
          <ManualAttendanceForm
            sessionId={session.id}
            options={manualOptions}
          />
        </section>
      ) : null}

      {canClose && session.status === "open" ? (
        <CloseSessionButton sessionId={session.id} />
      ) : null}

      <Link
        href={`/classes/${session.class_id}`}
        className="block text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Ir para a turma
      </Link>
    </div>
  );
}
