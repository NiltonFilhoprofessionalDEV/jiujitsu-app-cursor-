import { describe, it, expect } from "vitest";
import { getAppNavItems } from "@/components/layout/nav-items";
import {
  availableJourneyTracks,
  defaultAppHomePath,
  primaryProgressNavItem,
} from "@/lib/journey/nav";
import { can } from "@/lib/permissions/capabilities";

describe("primaryProgressNavItem", () => {
  it("returns journey for instructor", () => {
    expect(primaryProgressNavItem("instructor")).toEqual({
      href: "/journey",
      label: "Jornada",
      icon: "journey",
    });
  });

  it("returns journey for student", () => {
    expect(primaryProgressNavItem("student")).toEqual({
      href: "/journey",
      label: "Jornada",
      icon: "journey",
    });
  });

  it("returns null for guardian", () => {
    expect(primaryProgressNavItem("guardian")).toBeNull();
  });
});

describe("defaultAppHomePath", () => {
  it("sends students to journey", () => {
    expect(defaultAppHomePath("student")).toBe("/journey");
  });

  it("sends staff to home", () => {
    expect(defaultAppHomePath("instructor")).toBe("/home");
  });
});

describe("availableJourneyTracks", () => {
  it("gives student only student track", () => {
    expect(availableJourneyTracks("student")).toEqual(["student"]);
  });

  it("gives instructor both tracks", () => {
    expect(availableJourneyTracks("instructor")).toEqual([
      "student",
      "teaching",
    ]);
  });
});

describe("capabilities", () => {
  it("allows instructor teaching and student journey", () => {
    expect(can("instructor", "view_teaching_journey")).toBe(true);
    expect(can("instructor", "view_own_journey")).toBe(true);
  });

  it("denies student teaching journey", () => {
    expect(can("student", "view_teaching_journey")).toBe(false);
  });
});

describe("getAppNavItems", () => {
  it("orders student tabs with Galeria", () => {
    expect(getAppNavItems("student").map((i) => i.href)).toEqual([
      "/journey",
      "/classes",
      "/checkin",
      "/classroom",
      "/menu",
    ]);
    expect(getAppNavItems("student").find((i) => i.href === "/classroom")?.label).toBe(
      "Galeria",
    );
  });

  it("gives staff journey instead of stats in bottom nav", () => {
    expect(getAppNavItems("instructor").map((i) => i.href)).toEqual([
      "/home",
      "/classes",
      "/checkin",
      "/journey",
      "/menu",
    ]);
  });
});
