import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  Bell,
  Building2,
  Clapperboard,
  ChevronRight,
  LogOut,
  Megaphone,
  User,
  Users,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getActiveAcademyBrief } from "@/lib/academy/active";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

export default async function MenuPage() {
  let membership;
  let academy;
  try {
    membership = await getActiveMembership();
    academy = await getActiveAcademyBrief();
  } catch {
    redirect("/select-academy");
  }

  const links = [
    {
      href: "/members",
      label: "Membros",
      icon: Users,
      show:
        can(membership.role, "view_members") ||
        can(membership.role, "manage_members"),
    },
    {
      href: "/graduations",
      label: "Graduações",
      icon: Award,
      show:
        can(membership.role, "graduate") ||
        can(membership.role, "view_members"),
    },
    {
      href: "/announcements",
      label: "Avisos",
      icon: Megaphone,
      show: can(membership.role, "view_announcements"),
    },
    {
      href: "/classroom",
      label: "Sala virtual",
      icon: Clapperboard,
      show: can(membership.role, "view_virtual_lessons"),
    },
    {
      href: "/notifications",
      label: "Notificações",
      icon: Bell,
      show: true,
    },
    {
      href: "/academy",
      label: "Academia",
      icon: Building2,
      show: can(membership.role, "manage_academy"),
    },
    {
      href: "/profile",
      label: "Perfil",
      icon: User,
      show: true,
    },
  ].filter((link) => link.show);

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

      <nav className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--surface-shadow)] backdrop-blur-xl transition duration-200 hover:translate-x-0.5 hover:bg-muted active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/70">
              <Icon className="h-4 w-4 text-[var(--action-red)] transition group-hover:scale-110" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </nav>

      <section className="space-y-2">
        <p className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Preferências
        </p>
        <ThemeToggle />
      </section>
    </div>
  );
}
