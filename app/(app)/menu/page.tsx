import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import {
  getVisibleMenuNavItems,
  NAV_ICONS,
} from "@/components/layout/nav-items";
import { UnreadDot } from "@/components/layout/unread-dot";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { getUnreadBadges } from "@/lib/inbox/unread";
import { getActiveMembership } from "@/lib/permissions/assert";

export default async function MenuPage() {
  let membership;
  let academy;
  let badges;
  try {
    [membership, academy, badges] = await Promise.all([
      getActiveMembership(),
      getActiveAcademyBrief(),
      getUnreadBadges(),
    ]);
  } catch {
    redirect("/select-academy");
  }

  const links = getVisibleMenuNavItems(membership.role);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={academy.name}
        title="Menu"
        description="Atalhos e preferências"
        action={
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-border bg-card text-muted-foreground hover:bg-muted hover:text-[var(--bjj-danger)]"
              aria-label="Sair do app"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        }
      />

      <nav className="space-y-2 lg:hidden">
        {links.map(({ href, label, icon, badgeKey }) => {
          const Icon = NAV_ICONS[icon];
          const hasBadge = Boolean(badgeKey && badges[badgeKey] > 0);
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 hover:translate-x-0.5 hover:bg-muted active:scale-[0.99]"
              aria-label={
                hasBadge ? `${label}, novidades não lidas` : label
              }
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-background/70">
                <Icon className="h-4 w-4 text-[var(--action-red)] transition group-hover:scale-110" />
                <UnreadDot
                  show={hasBadge}
                  className="-right-0.5 -top-0.5 ring-card"
                />
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">
                {label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </nav>

      <p className="hidden rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground lg:block">
        No computador, os atalhos ficam na barra lateral. Use esta página para
        preferências.
      </p>

      <section className="space-y-2">
        <p className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Preferências
        </p>
        <ThemeToggle />
      </section>
    </div>
  );
}
