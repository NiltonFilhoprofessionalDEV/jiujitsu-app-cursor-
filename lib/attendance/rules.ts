import type {
  AttendanceRequestStatus,
  SessionStatus,
} from "@/types/domain";

export type CheckinRequestInput = {
  sessionStatus: SessionStatus;
  hasPending: boolean;
  hasRecord: boolean;
};

export type CheckinRequestResult =
  | { ok: true }
  | {
      ok: false;
      reason: "session_not_open" | "already_pending" | "already_recorded";
    };

export function canRequestCheckin(
  input: CheckinRequestInput,
): CheckinRequestResult {
  if (input.sessionStatus !== "open") {
    return { ok: false, reason: "session_not_open" };
  }
  if (input.hasPending) {
    return { ok: false, reason: "already_pending" };
  }
  if (input.hasRecord) {
    return { ok: false, reason: "already_recorded" };
  }
  return { ok: true };
}

export function canApproveRequest(status: AttendanceRequestStatus): boolean {
  return status === "pending";
}
