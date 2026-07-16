import { describe, it, expect } from "vitest";
import {
  canRequestCheckin,
  canApproveRequest,
} from "@/lib/attendance/rules";

describe("attendance rules", () => {
  it("blocks checkin when session not open", () => {
    expect(
      canRequestCheckin({
        sessionStatus: "finished",
        hasPending: false,
        hasRecord: false,
      }),
    ).toEqual({ ok: false, reason: "session_not_open" });
  });

  it("blocks duplicate pending", () => {
    expect(
      canRequestCheckin({
        sessionStatus: "open",
        hasPending: true,
        hasRecord: false,
      }),
    ).toEqual({ ok: false, reason: "already_pending" });
  });

  it("blocks when already recorded", () => {
    expect(
      canRequestCheckin({
        sessionStatus: "open",
        hasPending: false,
        hasRecord: true,
      }),
    ).toEqual({ ok: false, reason: "already_recorded" });
  });

  it("allows checkin when open and clean", () => {
    expect(
      canRequestCheckin({
        sessionStatus: "open",
        hasPending: false,
        hasRecord: false,
      }),
    ).toEqual({ ok: true });
  });

  it("approve only from pending", () => {
    expect(canApproveRequest("pending")).toBe(true);
    expect(canApproveRequest("approved")).toBe(false);
    expect(canApproveRequest("rejected")).toBe(false);
  });
});
