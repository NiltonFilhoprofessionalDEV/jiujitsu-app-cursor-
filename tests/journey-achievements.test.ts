import { describe, it, expect } from "vitest";
import { codesToUnlock } from "@/lib/journey/achievements";

describe("codesToUnlock", () => {
  it("returns student milestones reached that are not yet unlocked", () => {
    expect(codesToUnlock(25, [], "student")).toEqual([
      "classes_5",
      "classes_10",
      "classes_25",
    ]);
  });

  it("returns teaching milestones for teaching track", () => {
    expect(codesToUnlock(10, [], "teaching")).toEqual([
      "taught_5",
      "taught_10",
    ]);
  });

  it("skips already unlocked codes", () => {
    expect(codesToUnlock(25, ["classes_5", "classes_10"], "student")).toEqual([
      "classes_25",
    ]);
  });

  it("returns empty when none reached", () => {
    expect(codesToUnlock(0, [], "student")).toEqual([]);
    expect(codesToUnlock(4, [], "teaching")).toEqual([]);
  });
});
