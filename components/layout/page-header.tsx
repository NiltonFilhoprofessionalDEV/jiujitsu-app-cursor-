import { Suspense } from "react";
import { HeaderNotificationsBell } from "@/components/layout/header-notifications-bell";
import { HeaderUserAvatar } from "@/components/layout/header-user-avatar";
import { cn } from "@/lib/utils";

function HeaderChromeSkeleton({ round }: { round?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 animate-pulse border border-border bg-muted",
        round ? "rounded-full" : "rounded-full",
      )}
      aria-hidden
    />
  );
}

/** Sync header: title paints immediately; bell/avatar stream in Suspense. */
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  showAvatar = true,
  showNotifications = true,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
  showAvatar?: boolean;
  showNotifications?: boolean;
}) {
  return (
    <header
      className={cn(
        "page-enter flex items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--action-red)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--bjj-muted)]">{description}</p>
        ) : null}
      </div>
      {showAvatar || showNotifications || action ? (
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {action}
          {showNotifications ? (
            <Suspense fallback={<HeaderChromeSkeleton />}>
              <HeaderNotificationsBell />
            </Suspense>
          ) : null}
          {showAvatar ? (
            <Suspense fallback={<HeaderChromeSkeleton round />}>
              <HeaderUserAvatar />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
