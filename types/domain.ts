export type MemberRole =
  | "owner"
  | "administrator"
  | "instructor"
  | "assistant_instructor"
  | "student"
  | "guardian";

export type MemberStatus = "active" | "inactive" | "suspended";
export type SessionStatus = "scheduled" | "open" | "finished" | "cancelled";
export type AttendanceRequestStatus = "pending" | "approved" | "rejected";
export type AttendanceType = "self_checkin" | "manual";

export type Capability =
  | "manage_academy"
  | "view_dashboard"
  | "manage_members"
  | "view_members"
  | "manage_classes"
  | "open_session"
  | "close_session"
  | "approve_attendance"
  | "manual_attendance"
  | "self_checkin"
  | "graduate"
  | "manage_announcements"
  | "view_announcements";
