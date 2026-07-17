import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { HeaderNotificationsBell } from "@/components/layout/header-notifications-bell";
import { HeaderUserAvatar } from "@/components/layout/header-user-avatar";
import { cn } from "@/lib/utils";

/** Stable header chrome — avoids Suspense skeleton flicker on every navigation. */
export async function PageHeader({
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
        <BlackBeltTitle className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
          {title}
        </BlackBeltTitle>
        {description ? (
          <p className="text-sm text-[var(--bjj-muted)]">{description}</p>
        ) : null}
      </div>
      {showAvatar || showNotifications || action ? (
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {action}
          {showNotifications ? <HeaderNotificationsBell /> : null}
          {showAvatar ? <HeaderUserAvatar /> : null}
        </div>
      ) : null}
    </header>
  );
}
