import { redirect } from "next/navigation";
import {
  listNotifications,
  markAllNotificationsRead,
} from "@/actions/notifications";
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
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
            Notificações
          </h1>
          <p className="text-sm text-[var(--bjj-muted)]">
            {unread > 0
              ? `${unread} não lida${unread > 1 ? "s" : ""}`
              : "Todas lidas"}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-xs font-medium text-[var(--accent)]"
            >
              Marcar todas
            </button>
          </form>
        ) : null}
      </header>

      <section className="space-y-2">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border p-4 backdrop-blur-xl ${
                n.is_read
                  ? "border-white/10 bg-white/5"
                  : "border-[var(--accent)]/30 bg-[var(--accent)]/5"
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
