import { redirect } from "next/navigation";
import { listOpenSessions } from "@/actions/sessions";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
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
      <PageHeader
        title="Check-in"
        description="Aulas abertas agora no tatame"
      />

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <EmptyState
            title="Nenhuma aula aberta"
            description={
              canOpen
                ? "Abra uma aula pela turma para os alunos baterem presença."
                : "Quando o professor abrir a aula, ela aparece aqui para o check-in."
            }
            actionHref={canOpen ? "/classes" : undefined}
            actionLabel={canOpen ? "Ver turmas" : undefined}
          />
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl"
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
