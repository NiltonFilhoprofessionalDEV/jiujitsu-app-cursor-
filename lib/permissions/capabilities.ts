import type { Capability, MemberRole } from "@/types/domain";

const matrix: Record<MemberRole, Capability[]> = {
  owner: [
    "manage_academy",
    "view_dashboard",
    "manage_members",
    "view_members",
    "manage_classes",
    "open_session",
    "close_session",
    "approve_attendance",
    "manual_attendance",
    "graduate",
    "manage_announcements",
    "view_announcements",
  ],
  administrator: [
    "view_dashboard",
    "manage_members",
    "view_members",
    "manage_classes",
    "open_session",
    "close_session",
    "approve_attendance",
    "manual_attendance",
    "graduate",
    "manage_announcements",
    "view_announcements",
  ],
  instructor: [
    "view_dashboard",
    "manage_members",
    "view_members",
    "manage_classes",
    "open_session",
    "close_session",
    "approve_attendance",
    "manual_attendance",
    "graduate",
    "manage_announcements",
    "view_announcements",
  ],
  assistant_instructor: [
    "view_members",
    "open_session",
    "manual_attendance",
    "view_announcements",
  ],
  student: ["self_checkin", "view_announcements"],
  guardian: ["view_announcements", "view_members"],
};

export function can(role: MemberRole, capability: Capability): boolean {
  return matrix[role]?.includes(capability) ?? false;
}
