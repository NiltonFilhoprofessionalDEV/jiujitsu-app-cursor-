"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Bell, CheckCheck, XIcon } from "lucide-react";
import {
  markAllNotificationsRead,
  type NotificationRow,
} from "@/actions/notifications";
import { NotificationCard } from "@/components/notifications/notification-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function NotificationsGlassSheet({
  initialNotifications,
  unreadCount,
}: {
  initialNotifications: NotificationRow[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialNotifications);
  const [optimisticItems, setOptimistic] = useOptimistic(
    items,
    (
      current: NotificationRow[],
      action: { type: "one"; id: string } | { type: "all" },
    ) => {
      if (action.type === "all") {
        return current.map((n) => ({ ...n, is_read: true }));
      }
      return current.map((n) =>
        n.id === action.id ? { ...n, is_read: true } : n,
      );
    },
  );

  useEffect(() => {
    setItems(initialNotifications);
  }, [initialNotifications]);

  const unread = optimisticItems.filter((n) => !n.is_read).length;
  const badgeCount = open ? unread : Math.max(unreadCount, unread);

  function markAll() {
    startTransition(async () => {
      setOptimistic({ type: "all" });
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[var(--surface-shadow)] transition",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action-red)]/50",
        )}
        aria-label={
          badgeCount > 0
            ? `Notificações, ${badgeCount} não lida${badgeCount > 1 ? "s" : ""}`
            : "Notificações"
        }
        title="Notificações"
      >
        <Bell className="h-5 w-5" />
        {badgeCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--action-red)] px-1 text-[10px] font-bold text-primary-foreground">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="z-[60] bg-black/55 supports-backdrop-filter:backdrop-blur-sm"
        className={cn(
          "z-[60] mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-t-2xl border-border p-0",
          "bg-[var(--inbox-sheet-bg)] shadow-[var(--page-fab-shadow)]",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <SheetHeader className="gap-1 border-b border-border px-4 pb-3 pt-4">
          <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-foreground/20" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="font-display text-xl tracking-[0.06em] text-foreground">
                Notificações
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">
                {unread > 0
                  ? `${unread} não lida${unread > 1 ? "s" : ""}`
                  : "Tudo em dia"}
              </SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {unread > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={markAll}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-medium text-foreground transition hover:bg-muted"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marcar todas
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted"
                aria-label="Fechar"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {optimisticItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Nada novo por enquanto
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Graduações, presenças e avisos aparecem aqui.
              </p>
            </div>
          ) : (
            optimisticItems.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                compact
                onRead={(id) => {
                  startTransition(() => {
                    setOptimistic({ type: "one", id });
                    setItems((prev) =>
                      prev.map((item) =>
                        item.id === id ? { ...item, is_read: true } : item,
                      ),
                    );
                  });
                }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
