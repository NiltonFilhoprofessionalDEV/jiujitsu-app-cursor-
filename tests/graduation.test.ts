import { describe, it, expect } from "vitest";
import { buildGraduationUpdate } from "@/lib/graduations/apply";

describe("buildGraduationUpdate", () => {
  it("builds append-only payload", () => {
    const result = buildGraduationUpdate({
      memberId: "m1",
      belt: "Azul",
      degree: 2,
      awardedBy: "i1",
      notes: "Promoção",
    });
    expect(result.history).toMatchObject({
      member_id: "m1",
      belt: "Azul",
      degree: 2,
    });
    expect(result.memberPatch).toEqual({
      current_belt: "Azul",
      current_degree: 2,
    });
  });

  it("never mutates previous history entries", () => {
    const previous = Object.freeze([
      Object.freeze({
        member_id: "m1",
        belt: "Branca",
        degree: 0,
        awarded_by: "i0",
        notes: "Início",
      }),
    ]);
    const snapshot = structuredClone(previous);

    const result = buildGraduationUpdate({
      memberId: "m1",
      belt: "Azul",
      degree: 1,
      awardedBy: "i1",
      notes: "Nova",
      previousHistory: previous,
    });

    expect(previous).toEqual(snapshot);
    expect(result.history).not.toBe(previous[0]);
    expect(result.history.belt).toBe("Azul");
  });

  it("includes awarded_by and notes in history insert", () => {
    const result = buildGraduationUpdate({
      memberId: "m1",
      belt: "Roxa",
      degree: 0,
      awardedBy: "i2",
      notes: "Excelente",
    });
    expect(result.history.awarded_by).toBe("i2");
    expect(result.history.notes).toBe("Excelente");
  });
});
