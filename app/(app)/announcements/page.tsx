import { redirect } from "next/navigation";
import { listAnnouncements } from "@/actions/announcements";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { AnnouncementsFilterBar } from "./announcements-filter-bar";
import { NewAnnouncementSheet } from "./new-announcement-sheet";

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

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; unread?: string; new?: string }>;
}) {
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
  const params = await searchParams;

  let announcements: Awaited<ReturnType<typeof listAnnouncements>> = [];
  let listError: string | null = null;
  try {
    announcements = await listAnnouncements();
  } catch (err) {
    if (err instanceof Error && err.message.includes("No active academy")) {
      redirect("/select-academy");
    }
    listError =
      err instanceof Error
        ? err.message
        : "Não foi possível carregar os avisos.";
  }

  const q = params.q?.trim().toLowerCase() ?? "";
  const unreadOnly = params.unread === "1";
  const filtered = announcements.filter((a) => {
    if (unreadOnly && a.is_read) return false;
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
  });

  const hasActiveFilters = Boolean(q || unreadOnly);

  return (
    <div className="space-y-5">
      <PageHeader title="Avisos" description="Recados do tatame para a equipe" />

      <AnnouncementsFilterBar
        initial={{ q: params.q, unread: params.unread }}
      />

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Quadro
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {filtered.length}
          </p>
        </div>

        {listError ? (
          <EmptyState
            title="Não foi possível carregar os avisos"
            description={listError}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "Nenhum aviso encontrado"
                : "Quadro de avisos vazio"
            }
            description={
              hasActiveFilters
                ? "Ajuste a busca ou os filtros."
                : "Quando houver comunicado da academia, ele aparece aqui para todo mundo."
            }
            actionHref={
              canManage && !hasActiveFilters
                ? "/announcements?new=1"
                : undefined
            }
            actionLabel={
              canManage && !hasActiveFilters
                ? "Publicar primeiro aviso"
                : undefined
            }
          />
        ) : (
          filtered.map((a) => (
            <AnnouncementCard
              key={a.id}
              id={a.id}
              title={a.title}
              description={a.description}
              createdAtLabel={formatDateTime(a.created_at)}
              authorName={a.created_by_name}
              initialRead={a.is_read}
              canManage={canManage}
            />
          ))
        )}
      </section>

      {canManage ? (
        <NewAnnouncementSheet defaultOpen={params.new === "1"} />
      ) : null}
    </div>
  );
}
