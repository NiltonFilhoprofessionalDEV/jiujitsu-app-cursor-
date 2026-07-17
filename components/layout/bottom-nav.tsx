"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS, type AppNavItem } from "@/components/layout/nav-items";
import { UnreadDot } from "@/components/layout/unread-dot";
import { cn } from "@/lib/utils";

export function BottomNav({
  items,
  menuHasUnread = false,
}: {
  items: AppNavItem[];
  menuHasUnread?: boolean;
}) {
  const pathname = usePathname();
  const gridColsClass = items.length === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg overflow-visible border-t border-border pb-[max(1.35rem,calc(0.85rem+env(safe-area-inset-bottom)))] lg:hidden"
      style={{ background: "var(--nav-bg)" }}
      aria-label="Navegação principal"
    >
      <ul className={cn("grid items-end px-2 pt-2.5 pb-1.5", gridColsClass)}>
        {items.map(({ href, label, icon, fab }) => {
          const Icon = NAV_ICONS[icon];
          const active = pathname.startsWith(href);
          if (fab) {
            return (
              <li key={href} className="relative flex justify-center">
                <Link
                  href={href}
                  prefetch={false}
                  className="group -mt-8 flex flex-col items-center gap-1"
                  aria-label={label}
                >
                  <span
                    className={cn(
                      "relative z-10 flex h-16 w-16 items-center justify-center rounded-full",
                      "bg-gradient-to-b from-[#ff3b30] to-[var(--action-red)]",
                      "text-white",
                      "ring-4",
                      "transition-transform duration-200 group-active:scale-95",
                      active && "scale-[1.02]",
                    )}
                    style={{
                      boxShadow: `0 8px 20px rgba(0,0,0,0.35), 0 0 18px var(--fab-glow)`,
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full ring-4"
                      style={{ boxShadow: "0 0 0 4px var(--nav-ring)" }}
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-white/25 opacity-70 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
                    <Icon className="relative h-7 w-7 stroke-[2.25]" />
                  </span>
                  <span
                    className={cn(
                      "font-display text-[11px] tracking-[0.14em]",
                      active
                        ? "text-[var(--action-red)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          }
          const showMenuDot = href === "/menu" && menuHasUnread;
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "relative flex min-h-12 flex-col items-center justify-center gap-1 pb-1 text-[10px] tracking-wide",
                  active
                    ? "text-[var(--action-red)]"
                    : "text-muted-foreground",
                )}
                aria-label={
                  showMenuDot ? `${label}, novidades não lidas` : label
                }
              >
                <span className="relative inline-flex">
                  <Icon className="h-5 w-5" />
                  <UnreadDot show={showMenuDot} className="-right-1 -top-0.5" />
                </span>
                <span className={active ? "font-semibold" : undefined}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
