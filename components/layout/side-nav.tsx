"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import {
  NAV_ICONS,
  type AppNavItem,
  type VisibleMenuNavItem,
} from "@/components/layout/nav-items";
import { UnreadDot } from "@/components/layout/unread-dot";
import { Button } from "@/components/ui/button";
import type { UnreadBadges } from "@/lib/inbox/unread";
import { cn } from "@/lib/utils";

export function SideNav({
  primaryItems,
  menuItems,
  badges,
}: {
  primaryItems: AppNavItem[];
  menuItems: VisibleMenuNavItem[];
  badges: UnreadBadges;
}) {
  const pathname = usePathname();
  const desktopPrimaryItems = primaryItems.filter(
    (item) => item.href !== "/menu",
  );

  return (
    <aside
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border px-3 py-6 lg:flex"
      style={{ background: "var(--nav-bg)" }}
    >
      <Link
        href="/home"
        className="group mb-2 block rounded-xl px-3 pb-5 pt-1 outline-none transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="BJJ Pulse — início"
      >
        <BrandWordmark className="text-2xl leading-none tracking-[0.06em]" />
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Painel web
        </p>
      </Link>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        aria-label="Navegação principal"
      >
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Principal
          </p>
          {desktopPrimaryItems.map(({ href, label, icon, fab }) => {
            const Icon = NAV_ICONS[icon];
            const active = pathname.startsWith(href);

            if (fab) {
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    "bg-gradient-to-r from-[#ff3b30] to-[var(--action-red)] text-white",
                    "shadow-[0_0_20px_var(--fab-glow)] hover:brightness-110",
                    "active:scale-[0.98]",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-[var(--action-red)]/12 font-semibold text-[var(--action-red)]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>

        {menuItems.length > 0 ? (
          <div className="space-y-1 border-t border-border pt-4">
            <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Mais
            </p>
            {menuItems.map(({ href, label, icon, badgeKey }) => {
              const Icon = NAV_ICONS[icon];
              const active = pathname.startsWith(href);
              const hasBadge = Boolean(badgeKey && badges[badgeKey] > 0);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-[var(--action-red)]/12 font-semibold text-[var(--action-red)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="relative inline-flex shrink-0">
                    <Icon className="h-5 w-5" />
                    <UnreadDot
                      show={hasBadge}
                      className="-right-1 -top-0.5 ring-[var(--nav-bg)]"
                    />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="mt-4 border-t border-border pt-4">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 px-3 text-muted-foreground hover:text-[var(--bjj-danger)]"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
