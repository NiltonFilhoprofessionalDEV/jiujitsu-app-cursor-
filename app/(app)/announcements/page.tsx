import { redirect } from "next/navigation";
import { listAnnouncements } from "@/actions/announcements";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
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
      <PageHeader title="Avisos" description="Recados do tatame para a equipe" />

      {canManage ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
          <h2 className="text-sm font-medium text-foreground">Novo aviso</h2>
          <NewAnnouncementForm />
        </section>
      ) : null}

      <section className="space-y-2">
        {announcements.length === 0 ? (
          <EmptyState
            title="Quadro de avisos vazio"
            description="Quando houver comunicado da academia, ele aparece aqui para todo mundo."
          />
        ) : (
          announcements.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl border border-border bg-card p-4 backdrop-blur-xl"
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
