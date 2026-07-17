import {
  Award,
  Bell,
  ClipboardCheck,
  Megaphone,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NotificationKind =
  | "graduation"
  | "attendance"
  | "trophy"
  | "announcement"
  | "general";

export function inferNotificationKind(
  title: string,
  description?: string,
): NotificationKind {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (
    text.includes("gradua") ||
    text.includes("faixa") ||
    text.includes("grau")
  ) {
    return "graduation";
  }
  if (
    text.includes("presença") ||
    text.includes("presenca") ||
    text.includes("check-in") ||
    text.includes("checkin") ||
    text.includes("aprovad")
  ) {
    return "attendance";
  }
  if (text.includes("troféu") || text.includes("trofeu")) {
    return "trophy";
  }
  if (text.includes("aviso") || text.includes("comunicado")) {
    return "announcement";
  }
  return "general";
}

export function notificationKindMeta(kind: NotificationKind): {
  icon: LucideIcon;
  wash: string;
  label: string;
} {
  switch (kind) {
    case "graduation":
      return {
        icon: Award,
        wash: "var(--inbox-icon-grad)",
        label: "Graduação",
      };
    case "attendance":
      return {
        icon: ClipboardCheck,
        wash: "var(--inbox-icon-checkin)",
        label: "Presença",
      };
    case "trophy":
      return {
        icon: Trophy,
        wash: "var(--inbox-icon-trophy)",
        label: "Troféu",
      };
    case "announcement":
      return {
        icon: Megaphone,
        wash: "var(--inbox-icon-announce)",
        label: "Aviso",
      };
    default:
      return {
        icon: Bell,
        wash: "var(--inbox-icon-wash)",
        label: "Geral",
      };
  }
}
