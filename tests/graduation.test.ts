import { describe, it, expect } from "vitest";
import type { GraduationRow } from "@/actions/graduations";
import { buildGraduationUpdate } from "@/lib/graduations/apply";
import {
  memberBeltPatchFromLatest,
  pickLatestGraduation,
} from "@/lib/graduations/sync-member-belt";
import { withPreviousBelt } from "@/lib/graduations/with-previous-belt";

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

function row(
  partial: Partial<GraduationRow> &
    Pick<GraduationRow, "id" | "member_id" | "belt" | "graduated_at">,
): GraduationRow {
  return {
    degree: 0,
    awarded_by: null,
    notes: null,
    member_name: "Aluno",
    awarded_by_name: null,
    ...partial,
  };
}

describe("withPreviousBelt", () => {
  it("shows from→to using chronological order, even when list is newest-first", () => {
    const graduations = [
      row({
        id: "newer",
        member_id: "m1",
        belt: "Azul",
        degree: 0,
        graduated_at: "2026-07-17",
      }),
      row({
        id: "older",
        member_id: "m1",
        belt: "Laranja",
        degree: 4,
        graduated_at: "2026-01-10",
      }),
    ];

    const result = withPreviousBelt(graduations);
    const azul = result.find((g) => g.id === "newer")!;
    const laranja = result.find((g) => g.id === "older")!;

    expect(azul.previous_belt).toBe("Laranja");
    expect(azul.previous_degree).toBe(4);
    expect(laranja.previous_belt).toBeNull();
  });

  it("does not reverse same-day promotions when list order is unstable", () => {
    const graduations = [
      row({
        id: "a-laranja",
        member_id: "m1",
        belt: "Laranja",
        degree: 4,
        graduated_at: "2026-07-17",
      }),
      row({
        id: "b-azul",
        member_id: "m1",
        belt: "Azul",
        degree: 0,
        graduated_at: "2026-07-17",
      }),
    ];

    const result = withPreviousBelt(graduations);
    const azul = result.find((g) => g.id === "b-azul")!;
    const laranja = result.find((g) => g.id === "a-laranja")!;

    expect(azul.previous_belt).toBe("Laranja");
    expect(laranja.previous_belt).toBeNull();
  });
});

describe("pickLatestGraduation", () => {
  it("picks newest by date then id", () => {
    const latest = pickLatestGraduation([
      {
        id: "a",
        belt: "Laranja",
        degree: 4,
        graduated_at: "2026-07-17",
      },
      {
        id: "b",
        belt: "Azul",
        degree: 0,
        graduated_at: "2026-07-17",
      },
      {
        id: "c",
        belt: "Verde",
        degree: 2,
        graduated_at: "2025-01-01",
      },
    ]);

    expect(latest?.id).toBe("b");
    expect(memberBeltPatchFromLatest(latest)).toEqual({
      current_belt: "Azul",
      current_degree: 0,
    });
  });

  it("falls back to white belt when history is empty", () => {
    expect(memberBeltPatchFromLatest(null)).toEqual({
      current_belt: "Branca",
      current_degree: 0,
    });
  });
});
