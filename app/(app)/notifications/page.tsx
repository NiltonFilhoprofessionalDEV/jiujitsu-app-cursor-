import { redirect } from "next/navigation";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationCard } from "@/components/notifications/notification-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { NotificationsFilterBar } from "./notifications-filter-bar";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; unread?: string }>;
}) {
  try {
    await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  const params = await searchParams;

  let notifications;
  try {
    notifications = await listNotifications();
  } catch {
    redirect("/select-academy");
  }

  const q = params.q?.trim().toLowerCase() ?? "";
  const unreadOnly = params.unread === "1";

  const filtered = notifications.filter((n) => {
    if (unreadOnly && n.is_read) return false;
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q)
    );
  });

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notificações"
        description={
          unread > 0
            ? `${unread} não lida${unread > 1 ? "s" : ""}`
            : "Todas lidas"
        }
        showNotifications={false}
        action={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="text-xs font-medium text-[var(--action-red)]"
              >
                Marcar todas
              </button>
            </form>
          ) : undefined
        }
      />

      <NotificationsFilterBar
        initial={{ q: params.q, unread: params.unread }}
      />

      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Inbox
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {filtered.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              q || unreadOnly
                ? "Nenhuma notificação encontrada"
                : "Nada novo por enquanto"
            }
            description={
              q || unreadOnly
                ? "Ajuste a busca ou os filtros."
                : "Graduações, presenças e avisos do tatame aparecem aqui."
            }
          />
        ) : (
          filtered.map((n) => (
            <NotificationCard key={n.id} notification={n} />
          ))
        )}
      </section>
    </div>
  );
}
