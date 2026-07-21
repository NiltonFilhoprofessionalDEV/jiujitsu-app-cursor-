import {
  Award,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Clapperboard,
  ClipboardCheck,
  Home,
  Megaphone,
  Menu,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can } from "@/lib/permissions/capabilities";
import { primaryProgressNavItem } from "@/lib/journey/nav";
import type { MemberRole } from "@/types/domain";

export type NavIconName =
  | "home"
  | "classes"
  | "checkin"
  | "stats"
  | "journey"
  | "menu"
  | "members"
  | "graduations"
  | "announcements"
  | "classroom"
  | "notifications"
  | "academy"
  | "profile";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  home: Home,
  classes: CalendarDays,
  checkin: ClipboardCheck,
  stats: BarChart3,
  journey: Trophy,
  menu: Menu,
  members: Users,
  graduations: Award,
  announcements: Megaphone,
  classroom: Clapperboard,
  notifications: Bell,
  academy: Building2,
  profile: User,
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  fab?: boolean;
};

/** Bottom nav (mobile) + primary section (desktop). */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/classes", label: "Turmas", icon: "classes" },
  { href: "/checkin", label: "Check-in", icon: "checkin", fab: true },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/menu", label: "Menu", icon: "menu" },
];

/**
 * Role-aware primary nav.
 * Student: Jornada → Turmas → Check-in → Galeria → Menu
 * Staff: Home → Turmas → Check-in → Jornada → Menu (Stats no Menu)
 */
export function getAppNavItems(role: MemberRole): AppNavItem[] {
  if (
    can(role, "view_own_journey") &&
    !can(role, "view_teaching_journey")
  ) {
    return [
      { href: "/journey", label: "Jornada", icon: "journey" },
      { href: "/classes", label: "Turmas", icon: "classes" },
      { href: "/checkin", label: "Check-in", icon: "checkin", fab: true },
      { href: "/classroom", label: "Galeria", icon: "classroom" },
      { href: "/menu", label: "Menu", icon: "menu" },
    ];
  }

  if (can(role, "view_teaching_journey")) {
    return [
      { href: "/home", label: "Home", icon: "home" },
      { href: "/classes", label: "Turmas", icon: "classes" },
      { href: "/checkin", label: "Check-in", icon: "checkin", fab: true },
      { href: "/journey", label: "Jornada", icon: "journey" },
      { href: "/menu", label: "Menu", icon: "menu" },
    ];
  }

  const progress = primaryProgressNavItem(role);

  return APP_NAV_ITEMS.flatMap((item) => {
    if (item.href !== "/stats") return [item];
    if (!progress) return [];
    return [{ href: progress.href, label: progress.label, icon: progress.icon }];
  });
}

export type MenuNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  canShow: (role: MemberRole) => boolean;
};

/** Itens que no mobile ficam dentro de /menu; no desktop entram na sidebar. */
export const MENU_NAV_ITEMS: MenuNavItem[] = [
  {
    href: "/members",
    label: "Membros",
    icon: "members",
    canShow: (role) =>
      can(role, "view_members") || can(role, "manage_members"),
  },
  {
    href: "/graduations",
    label: "Graduações",
    icon: "graduations",
    canShow: (role) => can(role, "graduate") || can(role, "view_members"),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: "stats",
    canShow: (role) => can(role, "view_dashboard"),
  },
  {
    href: "/classroom",
    label: "Galeria de vídeos",
    icon: "classroom",
    // Pure students already have Galeria in the bottom nav.
    canShow: (role) =>
      can(role, "view_virtual_lessons") &&
      (!can(role, "view_own_journey") || can(role, "view_teaching_journey")),
  },
  {
    href: "/announcements",
    label: "Avisos",
    icon: "announcements",
    canShow: (role) => can(role, "view_announcements"),
  },
  {
    href: "/notifications",
    label: "Notificações",
    icon: "notifications",
    canShow: () => true,
  },
  {
    href: "/academy",
    label: "Academia",
    icon: "academy",
    canShow: (role) =>
      can(role, "manage_academy") || can(role, "graduate"),
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: "profile",
    canShow: () => true,
  },
];

export type VisibleMenuNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  badgeKey?: "announcements" | "notifications";
};

export function getVisibleMenuNavItems(role: MemberRole): VisibleMenuNavItem[] {
  return MENU_NAV_ITEMS.filter((item) => item.canShow(role)).map(
    ({ href, label, icon }) => {
      const badgeKey =
        href === "/announcements"
          ? ("announcements" as const)
          : href === "/notifications"
            ? ("notifications" as const)
            : undefined;
      return { href, label, icon, badgeKey };
    },
  );
}
