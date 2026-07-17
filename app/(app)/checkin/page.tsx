import { redirect } from "next/navigation";
import { listOpenSessions } from "@/actions/sessions";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { RequestCheckinButton } from "./request-checkin-button";

export default async function CheckinPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const canSelfCheckin = can(membership.role, "self_checkin");
  const canOpen = can(membership.role, "open_session");

  let sessions;
  try {
    sessions = await listOpenSessions();
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Check-in
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Aulas abertas na academia ativa
        </p>
      </header>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              Nenhuma aula aberta no momento.
            </p>
            {canOpen ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Abra uma aula a partir de uma turma.
              </p>
            ) : null}
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {session.class_name ?? "Aula"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.date}
                  {session.started_at
                    ? ` · ${new Date(session.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </p>
              </div>
              {canSelfCheckin ? (
                <RequestCheckinButton sessionId={session.id} />
              ) : canOpen ? (
                <a
                  href={`/sessions/${session.id}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted"
                >
                  Gerenciar aula
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Seu papel não permite check-in.
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
