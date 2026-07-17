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
    <nav className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-lg border-t border-white/10 bg-[#0b1220]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
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
                      "bg-gradient-to-b from-[#4ade80] to-[var(--accent)]",
                      "text-black shadow-[0_0_28px_rgba(34,197,94,0.55),0_8px_16px_rgba(0,0,0,0.35)]",
                      "ring-4 ring-[#0b1220]",
                      "transition-transform duration-200 group-active:scale-95",
                      active && "ring-[var(--accent)]/40",
                    )}
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-60 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
                    <Icon className="relative h-7 w-7 stroke-[2.25]" />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      active ? "text-[var(--accent)]" : "text-white/70",
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
                  "flex flex-col items-center gap-1 pb-0.5 text-[10px]",
                  active ? "text-[var(--accent)]" : "text-white/50",
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
