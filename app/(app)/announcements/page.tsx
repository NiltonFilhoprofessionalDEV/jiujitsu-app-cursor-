import { redirect } from "next/navigation";
import { listAnnouncements } from "@/actions/announcements";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { NewAnnouncementForm } from "./new-announcement-form";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AnnouncementsPage() {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_announcements")) {
    redirect("/home");
  }

  const canManage = can(membership.role, "manage_announcements");

  let announcements;
  try {
    announcements = await listAnnouncements();
  } catch {
    redirect("/select-academy");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Avisos
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Comunicados da academia
        </p>
      </header>

      {canManage ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-foreground">Novo aviso</h2>
          <NewAnnouncementForm />
        </section>
      ) : null}

      <section className="space-y-2">
        {announcements.length === 0 ? (
          <EmptyState
            title="Nenhum aviso publicado"
            description="Comunicados da academia aparecem aqui para toda a equipe."
          />
        ) : (
          announcements.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-foreground">{a.title}</h2>
                <time className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDateTime(a.created_at)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {a.description}
              </p>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Por {a.created_by_name}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
