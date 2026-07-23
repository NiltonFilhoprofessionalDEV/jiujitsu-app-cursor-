import { describe, expect, it } from "vitest";
import {
  beltSequenceForAge,
  suggestNextGraduationForAge,
} from "@/lib/belts/progression";
import { buildJourneyBeltCollection } from "@/lib/journey/belt-collection";

describe("beltSequenceForAge", () => {
  it("gives kids path for age 10 (no verde yet)", () => {
    const seq = beltSequenceForAge(10);
    expect(seq).toContain("Branca");
    expect(seq).toContain("Laranja");
    expect(seq).not.toContain("Verde");
    expect(seq).not.toContain("Azul");
  });

  it("gives adult path for age 16+", () => {
    const seq = beltSequenceForAge(16);
    expect(seq).toContain("Branca");
    expect(seq).toContain("Azul");
    expect(seq).not.toContain("Cinza");
  });
});

describe("suggestNextGraduationForAge", () => {
  it("advances degree then next kids belt", () => {
    expect(suggestNextGraduationForAge("Cinza / Branca", 3, 8)).toEqual({
      belt: "Cinza / Branca",
      degree: 4,
    });
    expect(suggestNextGraduationForAge("Cinza / Branca", 4, 8)).toEqual({
      belt: "Cinza",
      degree: 0,
    });
  });

  it("moves adult from Branca to Azul", () => {
    expect(suggestNextGraduationForAge("Branca", 4, 18)).toEqual({
      belt: "Azul",
      degree: 0,
    });
  });
});

describe("buildJourneyBeltCollection", () => {
  it("marks current belt unlocked with degrees", () => {
    const cards = buildJourneyBeltCollection({
      age: 12,
      currentBelt: "Amarela",
      currentDegree: 2,
      history: [
        { belt: "Branca", degree: 4 },
        { belt: "Cinza / Branca", degree: 4 },
        { belt: "Cinza", degree: 4 },
        { belt: "Cinza / Preta", degree: 4 },
        { belt: "Amarela / Branca", degree: 4 },
        { belt: "Amarela", degree: 2 },
      ],
    });
    const amarela = cards.find((c) => c.belt === "Amarela");
    expect(amarela?.unlocked).toBe(true);
    expect(amarela?.highestDegree).toBe(2);
    expect(amarela?.degrees.filter((d) => d.unlocked).map((d) => d.degree)).toEqual(
      [0, 1, 2],
    );
  });
});
