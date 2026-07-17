"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, BarChart3, Menu, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/classes", label: "Turmas", icon: CalendarDays },
  { href: "/checkin", label: "Check-in", icon: ScanLine, fab: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/menu", label: "Menu", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-lg border-t border-border pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      style={{ background: "var(--nav-bg)" }}
    >
      <ul className="grid grid-cols-5 items-end px-2 pt-2 pb-2">
        {items.map(({ href, label, icon: Icon, fab }) => {
          const active = pathname.startsWith(href);
          if (fab) {
            return (
              <li key={href} className="relative flex justify-center">
                <Link
                  href={href}
                  className="group -mt-8 flex flex-col items-center gap-1"
                  aria-label={label}
                >
                  <span
                    className={cn(
                      "relative flex h-16 w-16 items-center justify-center rounded-full",
                      "bg-gradient-to-b from-[#ff3b30] to-[var(--action-red)]",
                      "text-white",
                      "ring-4",
                      "transition-transform duration-200 group-active:scale-95",
                      active && "scale-[1.02]",
                    )}
                    style={{
                      boxShadow: `0 0 28px var(--fab-glow), 0 10px 18px rgba(0,0,0,0.35)`,
                      // ring color follows theme surface
                      outlineColor: "var(--nav-ring)",
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
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 pb-0.5 text-[10px] tracking-wide",
                  active
                    ? "text-[var(--action-red)]"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
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
