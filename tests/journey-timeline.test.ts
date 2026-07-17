import { describe, it, expect } from "vitest";
import { buildJourneyTimeline } from "@/lib/journey/timeline";

describe("buildJourneyTimeline", () => {
  it("includes joined, belt, degree, and trophies newest first", () => {
    const events = buildJourneyTimeline({
      joinedAt: "2024-01-01T12:00:00.000Z",
      graduations: [
        {
          id: "g1",
          belt: "Branca",
          degree: 0,
          graduated_at: "2024-02-01",
        },
        {
          id: "g2",
          belt: "Branca",
          degree: 1,
          graduated_at: "2024-04-01",
        },
        {
          id: "g3",
          belt: "Azul",
          degree: 0,
          graduated_at: "2024-06-01",
        },
      ],
      achievements: [
        {
          id: "a1",
          code: "classes_10",
          unlocked_at: "2024-07-01T12:00:00.000Z",
        },
      ],
      milestoneLabels: { classes_10: "Troféu de Pedra" },
    });

    expect(events.map((e) => e.type)).toEqual([
      "achievement",
      "belt",
      "degree",
      "belt",
      "joined",
    ]);
    expect(events[0].title).toContain("Troféu de Pedra");
    expect(events[0].meta).toBe("10 aulas");
    expect(events[1].title).toContain("Azul");
    expect(events[1].meta).toBe("Graduação de faixa");
    expect(events[2].title).toBe("Grau 1");
    expect(events[2].meta).toBe("Na faixa Branca");
    expect(events[3].title).toContain("Branca");
    expect(events[4].type).toBe("joined");
  });

  it("omits joined when joinedAt is null", () => {
    const events = buildJourneyTimeline({
      joinedAt: null,
      graduations: [],
      achievements: [],
      milestoneLabels: {},
    });
    expect(events).toEqual([]);
  });

  it("keeps notes on graduation meta when present", () => {
    const events = buildJourneyTimeline({
      joinedAt: null,
      graduations: [
        {
          id: "g1",
          belt: "Roxa",
          degree: 2,
          graduated_at: "2025-01-10",
          notes: "Exame de promoção",
        },
      ],
      achievements: [],
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("belt");
    expect(events[0].meta).toBe("Exame de promoção");
  });
});
