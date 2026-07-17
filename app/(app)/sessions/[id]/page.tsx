import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listPendingRequests } from "@/actions/attendance";
import { getSession } from "@/actions/sessions";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { CloseSessionButton } from "../close-session-button";
import { PendingRequestsList } from "../pending-requests-list";

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

  if (!canApprove && !canClose) {
    redirect("/checkin");
  }

  let pending: Awaited<ReturnType<typeof listPendingRequests>> = [];
  if (canApprove) {
    try {
      pending = await listPendingRequests(session.id);
    } catch {
      pending = [];
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/classes/${session.class_id}`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Turma
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
              {session.class_name ?? "Aula"}
            </h1>
            <p className="text-sm text-[var(--bjj-muted)]">
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

      {canClose && session.status === "open" ? (
        <CloseSessionButton sessionId={session.id} />
      ) : null}

      {canApprove ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-foreground">
            Pedidos pendentes
          </h2>
          <PendingRequestsList
            sessionId={session.id}
            initialRequests={pending}
          />
        </section>
      ) : null}
    </div>
  );
}
