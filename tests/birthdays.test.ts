import { describe, expect, it } from "vitest";
import {
  formatBirthdayNotification,
  listBirthdaysInRange,
  type BirthdayMemberInput,
} from "@/lib/birthdays/range";

const people: BirthdayMemberInput[] = [
  {
    memberId: "m1",
    profileId: "p1",
    name: "Ana",
    birthDate: "1990-07-20",
  },
  {
    memberId: "m2",
    profileId: "p2",
    name: "Bruno",
    birthDate: "1985-07-22",
  },
  {
    memberId: "m3",
    profileId: "p3",
    name: "Carla",
    birthDate: "2000-01-02",
  },
  {
    memberId: "m4",
    profileId: "p4",
    name: "Diego",
    birthDate: "1992-02-29",
  },
];

describe("listBirthdaysInRange", () => {
  it("includes today and next 7 days, today first", () => {
    const result = listBirthdaysInRange(people, "2026-07-20", 7);
    expect(result.map((r) => r.name)).toEqual(["Ana", "Bruno"]);
    expect(result[0]?.is_today).toBe(true);
    expect(result[0]?.occurs_on).toBe("2026-07-20");
    expect(result[0]?.age).toBe(36);
    expect(result[1]?.is_today).toBe(false);
    expect(result[1]?.occurs_on).toBe("2026-07-22");
  });

  it("wraps across year end", () => {
    const result = listBirthdaysInRange(people, "2025-12-28", 7);
    const carla = result.find((r) => r.name === "Carla");
    expect(carla?.occurs_on).toBe("2026-01-02");
    expect(carla?.is_today).toBe(false);
  });

  it("maps Feb 29 to Feb 28 on non-leap years", () => {
    const result = listBirthdaysInRange(people, "2025-02-28", 0);
    const diego = result.find((r) => r.name === "Diego");
    expect(diego?.occurs_on).toBe("2025-02-28");
    expect(diego?.is_today).toBe(true);
  });

  it("keeps Feb 29 on leap years", () => {
    const result = listBirthdaysInRange(people, "2024-02-29", 0);
    const diego = result.find((r) => r.name === "Diego");
    expect(diego?.occurs_on).toBe("2024-02-29");
    expect(diego?.is_today).toBe(true);
  });
});

describe("formatBirthdayNotification", () => {
  it("formats a single name", () => {
    expect(formatBirthdayNotification(["Ana"])).toEqual({
      title: "Aniversário hoje",
      description: "Ana faz aniversário hoje",
    });
  });

  it("formats two names", () => {
    expect(formatBirthdayNotification(["Ana", "Bruno"])).toEqual({
      title: "Aniversários hoje",
      description: "Ana e Bruno",
    });
  });

  it("formats three or more names", () => {
    expect(formatBirthdayNotification(["Ana", "Bruno", "Carla", "Diego"])).toEqual({
      title: "Aniversários hoje",
      description: "Ana, Bruno e mais 2…",
    });
  });
});
