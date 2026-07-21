import { describe, expect, it } from "vitest";
import { computeBeltProgress } from "@/lib/graduations/belt-progress";

const reqs = [{ belt: "Azul", classesPerDegree: 40 }];

describe("computeBeltProgress", () => {
  it("counts classes to next degree and next belt from degree 0", () => {
    const p = computeBeltProgress({
      currentBelt: "Azul",
      currentDegree: 0,
      classesSinceGraduation: 10,
      requirements: reqs,
    });
    expect(p.configured).toBe(true);
    expect(p.nextDegree).toBe(1);
    expect(p.classesToNextDegree).toBe(30);
    expect(p.nextBelt).toBe("Roxa");
    expect(p.classesToNextBelt).toBe(150);
    expect(p.eligibleForDegree).toBe(false);
    expect(p.eligibleForBelt).toBe(false);
  });

  it("marks eligible for degree at threshold", () => {
    const p = computeBeltProgress({
      currentBelt: "Azul",
      currentDegree: 2,
      classesSinceGraduation: 40,
      requirements: reqs,
    });
    expect(p.eligibleForDegree).toBe(true);
    expect(p.classesToNextDegree).toBe(0);
    expect(p.classesToNextBelt).toBe(40);
    expect(p.eligibleForBelt).toBe(false);
  });

  it("marks eligible for belt after all degree steps", () => {
    const p = computeBeltProgress({
      currentBelt: "Azul",
      currentDegree: 0,
      classesSinceGraduation: 160,
      requirements: reqs,
    });
    expect(p.eligibleForDegree).toBe(true);
    expect(p.eligibleForBelt).toBe(true);
    expect(p.classesToNextBelt).toBe(0);
  });

  it("at degree 4 uses one more cycle for next belt", () => {
    const p = computeBeltProgress({
      currentBelt: "Azul",
      currentDegree: 4,
      classesSinceGraduation: 10,
      requirements: reqs,
    });
    expect(p.nextDegree).toBeNull();
    expect(p.classesToNextDegree).toBeNull();
    expect(p.nextBelt).toBe("Roxa");
    expect(p.classesToNextBelt).toBe(30);
    expect(p.eligibleForBelt).toBe(false);
  });

  it("returns unconfigured when belt has no requirement", () => {
    const p = computeBeltProgress({
      currentBelt: "Branca",
      currentDegree: 0,
      classesSinceGraduation: 5,
      requirements: reqs,
    });
    expect(p.configured).toBe(false);
    expect(p.classesToNextDegree).toBeNull();
  });
});
