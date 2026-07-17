import { redirect } from "next/navigation";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getActiveMembership } from "@/lib/permissions/assert";
import { MarkReadButton } from "./mark-read-button";

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

export default async function NotificationsPage() {
  try {
    await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  let notifications;
  try {
    notifications = await listNotifications();
  } catch {
    redirect("/select-academy");
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description={
          unread > 0
            ? `${unread} não lida${unread > 1 ? "s" : ""}`
            : "Todas lidas"
        }
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

      <section className="space-y-2">
        {notifications.length === 0 ? (
          <EmptyState
            title="Nada novo por enquanto"
            description="Graduações, presenças e avisos do tatame aparecem aqui."
          />
        ) : (
          notifications.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 backdrop-blur-xl ${
                n.is_read
                  ? "border-border bg-card"
                  : "border-[var(--accent)]/30 bg-[var(--action-red)]/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {n.description}
                  </p>
                  <time className="mt-2 block text-[10px] text-muted-foreground">
                    {formatDateTime(n.created_at)}
                  </time>
                </div>
                {!n.is_read ? <MarkReadButton id={n.id} /> : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
