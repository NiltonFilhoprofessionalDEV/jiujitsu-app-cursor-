"use client";

import { useTransition } from "react";
import {
  markNotificationRead,
  type NotificationRow,
} from "@/actions/notifications";
import {
  inferNotificationKind,
  notificationKindMeta,
} from "@/lib/notifications/kind";
import { cn } from "@/lib/utils";

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

export function NotificationCard({
  notification,
  onRead,
  compact = false,
}: {
  notification: NotificationRow;
  onRead?: (id: string) => void;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const kind = inferNotificationKind(
    notification.title,
    notification.description,
  );
  const meta = notificationKindMeta(kind);
  const Icon = meta.icon;

  function handleMarkRead() {
    if (notification.is_read || pending) return;
    onRead?.(notification.id);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", notification.id);
      await markNotificationRead(null, formData);
    });
  }

  return (
    <article
      className={cn(
        "rounded-2xl border shadow-[var(--surface-shadow)] transition",
        compact ? "p-3.5" : "p-4",
        notification.is_read
          ? "border-border bg-card"
          : "border-[var(--inbox-unread-border)] bg-[var(--inbox-unread-bg)]",
      )}
    >
      <button
        type="button"
        disabled={notification.is_read || pending}
        onClick={handleMarkRead}
        className={cn(
          "flex w-full items-start gap-3 text-left",
          !notification.is_read && "cursor-pointer",
        )}
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: meta.wash }}
          aria-hidden
        >
          <Icon className="h-4 w-4 text-foreground" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">
              {notification.title}
            </p>
            {!notification.is_read ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--inbox-dot)]"
                aria-label="Não lida"
              />
            ) : null}
          </div>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {notification.description}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{meta.label}</span>
            <span aria-hidden>·</span>
            <time dateTime={notification.created_at}>
              {formatDateTime(notification.created_at)}
            </time>
          </div>
        </div>
      </button>
    </article>
  );
}
