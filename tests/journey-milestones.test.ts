import { describe, it, expect } from "vitest";
import {
  STUDENT_MILESTONES,
  TEACHING_MILESTONES,
  milestoneCode,
  nextMilestone,
  trophyTitle,
} from "@/lib/journey/milestones";

describe("STUDENT_MILESTONES", () => {
  it("has fixed v1 thresholds", () => {
    expect(STUDENT_MILESTONES.map((m) => m.threshold)).toEqual([
      5, 10, 25, 50, 100, 200,
    ]);
  });

  it("uses classes_* codes", () => {
    expect(STUDENT_MILESTONES.map((m) => m.code)).toEqual([
      "classes_5",
      "classes_10",
      "classes_25",
      "classes_50",
      "classes_100",
      "classes_200",
    ]);
  });

  it("uses progressive trophy materials", () => {
    expect(STUDENT_MILESTONES.map((m) => m.material)).toEqual([
      "wood",
      "stone",
      "iron",
      "silver",
      "gold",
      "diamond",
    ]);
  });
});

describe("TEACHING_MILESTONES", () => {
  it("uses taught_* codes", () => {
    expect(TEACHING_MILESTONES.map((m) => m.code)).toEqual([
      "taught_5",
      "taught_10",
      "taught_25",
      "taught_50",
      "taught_100",
      "taught_200",
    ]);
  });
});

describe("milestoneCode", () => {
  it("builds code from threshold", () => {
    expect(milestoneCode(25)).toBe("classes_25");
  });
});

describe("trophyTitle", () => {
  it("formats material trophy names", () => {
    expect(trophyTitle(STUDENT_MILESTONES[0])).toBe("Troféu de Madeira");
    expect(trophyTitle(STUDENT_MILESTONES[3])).toBe("Troféu de Prata");
  });
});

describe("nextMilestone", () => {
  it("returns next threshold above classCount", () => {
    expect(nextMilestone(8)?.threshold).toBe(10);
    expect(nextMilestone(25, "teaching")?.threshold).toBe(50);
  });

  it("returns null when all unlocked", () => {
    expect(nextMilestone(200)).toBeNull();
    expect(nextMilestone(500, "teaching")).toBeNull();
  });
});
