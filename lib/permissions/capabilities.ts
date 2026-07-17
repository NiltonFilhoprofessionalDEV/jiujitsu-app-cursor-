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
    "manage_virtual_lessons",
    "view_virtual_lessons",
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
    "manage_virtual_lessons",
    "view_virtual_lessons",
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
    "manage_virtual_lessons",
    "view_virtual_lessons",
  ],
  assistant_instructor: [
    "view_members",
    "open_session",
    "manual_attendance",
    "view_announcements",
    "view_virtual_lessons",
  ],
  student: ["self_checkin", "view_announcements", "view_virtual_lessons"],
  guardian: ["view_announcements", "view_members", "view_virtual_lessons"],
};

export function can(role: MemberRole, capability: Capability): boolean {
  return matrix[role]?.includes(capability) ?? false;
}
