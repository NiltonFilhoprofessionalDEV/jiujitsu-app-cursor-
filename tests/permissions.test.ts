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
  it("allows assistant_instructor approve_attendance", () => {
    expect(can("assistant_instructor", "approve_attendance")).toBe(true);
  });
  it("allows assistant_instructor manual_attendance", () => {
    expect(can("assistant_instructor", "manual_attendance")).toBe(true);
  });
  it("denies assistant_instructor close_session", () => {
    expect(can("assistant_instructor", "close_session")).toBe(false);
  });
  it("allows owner manage_academy", () => {
    expect(can("owner", "manage_academy")).toBe(true);
  });
  it("allows instructor manage_virtual_lessons", () => {
    expect(can("instructor", "manage_virtual_lessons")).toBe(true);
  });
  it("denies student manage_virtual_lessons", () => {
    expect(can("student", "manage_virtual_lessons")).toBe(false);
  });
  it("allows student view_virtual_lessons", () => {
    expect(can("student", "view_virtual_lessons")).toBe(true);
  });
  it("denies assistant_instructor manage_virtual_lessons", () => {
    expect(can("assistant_instructor", "manage_virtual_lessons")).toBe(false);
  });
  it("allows student view_own_journey", () => {
    expect(can("student", "view_own_journey")).toBe(true);
  });
  it("allows instructor student and teaching journey", () => {
    expect(can("instructor", "view_own_journey")).toBe(true);
    expect(can("instructor", "view_teaching_journey")).toBe(true);
  });
  it("denies student view_teaching_journey", () => {
    expect(can("student", "view_teaching_journey")).toBe(false);
  });
  it("denies guardian view_own_journey in v1", () => {
    expect(can("guardian", "view_own_journey")).toBe(false);
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
