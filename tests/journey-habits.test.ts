import { describe, it, expect } from "vitest";
import {
  computeMonthlyHistory,
  computeWeekStreak,
  computeWeeklyGoal,
  mondayOfWeek,
} from "@/lib/journey/habits";
import { zonedLocalToUtc } from "@/lib/sessions/auto-open";

const TZ = "America/Sao_Paulo";

describe("mondayOfWeek", () => {
  it("maps Wednesday to Monday", () => {
    expect(mondayOfWeek("2026-07-15")).toBe("2026-07-13");
  });

  it("keeps Monday as Monday", () => {
    expect(mondayOfWeek("2026-07-13")).toBe("2026-07-13");
  });

  it("maps Sunday to previous Monday", () => {
    expect(mondayOfWeek("2026-07-19")).toBe("2026-07-13");
  });
});

describe("computeWeekStreak", () => {
  it("counts consecutive weeks", () => {
    // Wed 2026-07-15
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    const dates = [
      "2026-07-13", // this week
      "2026-07-06", // last week
      "2026-06-30", // week before
    ];
    expect(computeWeekStreak(dates, now, TZ)).toEqual({
      weeks: 3,
      activeThisWeek: true,
    });
  });

  it("keeps streak from last week if current week empty", () => {
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    const dates = ["2026-07-08", "2026-07-01"];
    expect(computeWeekStreak(dates, now, TZ).weeks).toBe(2);
    expect(computeWeekStreak(dates, now, TZ).activeThisWeek).toBe(false);
  });

  it("returns zero when broken", () => {
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    expect(computeWeekStreak(["2026-06-20"], now, TZ).weeks).toBe(0);
  });
});

describe("computeWeeklyGoal", () => {
  it("counts sessions in current week", () => {
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    const progress = computeWeeklyGoal(
      ["2026-07-13", "2026-07-15", "2026-07-06"],
      now,
      TZ,
      3,
    );
    expect(progress.current).toBe(2);
    expect(progress.target).toBe(3);
    expect(progress.met).toBe(false);
    expect(progress.percent).toBe(67);
  });

  it("marks goal met", () => {
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    const progress = computeWeeklyGoal(
      ["2026-07-13", "2026-07-14", "2026-07-15"],
      now,
      TZ,
      3,
    );
    expect(progress.met).toBe(true);
    expect(progress.percent).toBe(100);
  });
});

describe("computeMonthlyHistory", () => {
  it("builds last N months including empty ones", () => {
    const now = zonedLocalToUtc("2026-07-15", "12:00:00", TZ);
    const months = computeMonthlyHistory(
      ["2026-07-01", "2026-07-10", "2026-05-05"],
      now,
      TZ,
      4,
    );
    expect(months.map((m) => m.key)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(months.find((m) => m.key === "2026-07")?.count).toBe(2);
    expect(months.find((m) => m.key === "2026-05")?.count).toBe(1);
    expect(months.find((m) => m.key === "2026-06")?.count).toBe(0);
  });
});
