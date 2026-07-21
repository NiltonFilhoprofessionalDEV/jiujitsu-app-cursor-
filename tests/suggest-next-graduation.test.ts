import { describe, expect, it } from "vitest";
import { suggestNextGraduation } from "@/lib/graduations/suggest-next";

describe("suggestNextGraduation", () => {
  it("advances degree on the same belt", () => {
    expect(suggestNextGraduation("Azul", 1)).toEqual({
      belt: "Azul",
      degree: 2,
    });
  });

  it("moves to the next belt after the 4th degree", () => {
    expect(suggestNextGraduation("Azul", 4)).toEqual({
      belt: "Roxa",
      degree: 0,
    });
  });

  it("moves through kids striped belts after the 4th degree", () => {
    expect(suggestNextGraduation("Cinza / Branca", 4)).toEqual({
      belt: "Cinza",
      degree: 0,
    });
    expect(suggestNextGraduation("Verde / Preta", 4)).toEqual({
      belt: "Azul",
      degree: 0,
    });
  });

  it("defaults missing belt to Branca", () => {
    expect(suggestNextGraduation(null, 0)).toEqual({
      belt: "Branca",
      degree: 1,
    });
  });
});
