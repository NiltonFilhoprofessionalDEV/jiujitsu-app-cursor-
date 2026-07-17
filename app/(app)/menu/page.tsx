import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  Bell,
  Building2,
  ChevronRight,
  Megaphone,
  User,
  Users,
} from "lucide-react";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";

export default async function MenuPage() {
  let membership;
  try {
    membership = await getActiveMembership();
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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          Menu
        </h1>
        <p className="text-sm text-[var(--bjj-muted)]">
          Atalhos e configurações
        </p>
      </header>

      <nav className="space-y-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 backdrop-blur-xl transition hover:bg-muted"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card">
              <Icon className="h-4 w-4 text-[var(--action-red)]" />
            </span>
            <span className="flex-1 text-sm font-medium text-foreground">
              {label}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
