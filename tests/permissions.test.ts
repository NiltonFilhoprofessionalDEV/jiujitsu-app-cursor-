import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions/capabilities";
import { assertCan, PermissionError } from "@/lib/permissions/assert";

describe("can", () => {
  it("allows instructor to manage members", () => {
    expect(can("instructor", "manage_members")).toBe(true);
  });
  it("denies student manage_members", () => {
    expect(can("student", "manage_members")).toBe(false);
  });
  it("allows student self_checkin", () => {
    expect(can("student", "self_checkin")).toBe(true);
  });
  it("denies assistant_instructor approve_attendance", () => {
    expect(can("assistant_instructor", "approve_attendance")).toBe(false);
  });
  it("allows owner manage_academy", () => {
    expect(can("owner", "manage_academy")).toBe(true);
  });
});

describe("assertCan", () => {
  it("throws PermissionError when role lacks capability", () => {
    expect(() => assertCan("student", "manage_members")).toThrow(PermissionError);
  });

  it("does not throw when role has capability", () => {
    expect(() => assertCan("owner", "manage_academy")).not.toThrow();
  });
});
