"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, BarChart3, Menu, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/classes", label: "Turmas", icon: CalendarDays },
  { href: "/checkin", label: "Check-in", icon: CircleDot, fab: true },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/menu", label: "Menu", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-lg border-t border-white/10 bg-[#0b1220]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 items-end px-2 pt-2 pb-3">
        {items.map(({ href, label, icon: Icon, fab }) => {
          const active = pathname.startsWith(href);
          if (fab) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-[0_0_24px_rgba(34,197,94,0.55)]"
                  aria-label={label}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 text-[10px]",
                  active ? "text-[var(--accent)]" : "text-white/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
