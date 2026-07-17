import { describe, it, expect } from "vitest";
import {
  findNextTraining,
  formatNextTrainingLabel,
} from "@/lib/classes/next-training";
import { zonedLocalToUtc } from "@/lib/sessions/auto-open";

const TZ = "America/Sao_Paulo";

const mondayNight = {
  id: "s1",
  weekday: 1,
  start_time: "19:00:00",
  end_time: "20:30:00",
};

const wednesdayNight = {
  id: "s2",
  weekday: 3,
  start_time: "20:00:00",
  end_time: "21:30:00",
};

describe("findNextTraining", () => {
  it("returns today's upcoming class", () => {
    // Monday 2026-07-13 10:00 BRT
    const now = zonedLocalToUtc("2026-07-13", "10:00:00", TZ);
    const next = findNextTraining([mondayNight, wednesdayNight], now, TZ);
    expect(next?.dayOffset).toBe(0);
    expect(next?.scheduleId).toBe("s1");
    expect(next?.isOngoing).toBe(false);
    expect(formatNextTrainingLabel(next!)).toBe("Hoje · 19:00");
  });

  it("marks ongoing class", () => {
    const now = zonedLocalToUtc("2026-07-13", "19:30:00", TZ);
    const next = findNextTraining([mondayNight], now, TZ);
    expect(next?.isOngoing).toBe(true);
    expect(formatNextTrainingLabel(next!)).toBe("Em andamento · até 20:30");
  });

  it("skips finished class and picks tomorrow/next", () => {
    // Monday after class ended
    const now = zonedLocalToUtc("2026-07-13", "21:00:00", TZ);
    const next = findNextTraining([mondayNight, wednesdayNight], now, TZ);
    expect(next?.scheduleId).toBe("s2");
    expect(next?.dayOffset).toBe(2);
    expect(formatNextTrainingLabel(next!)).toBe("Quarta · 20:00");
  });

  it("returns null when no schedules", () => {
    const now = zonedLocalToUtc("2026-07-13", "10:00:00", TZ);
    expect(findNextTraining([], now, TZ)).toBeNull();
  });

  it("labels tomorrow", () => {
    // Sunday evening -> Monday is tomorrow
    const now = zonedLocalToUtc("2026-07-12", "18:00:00", TZ);
    const next = findNextTraining([mondayNight], now, TZ);
    expect(next?.dayOffset).toBe(1);
    expect(formatNextTrainingLabel(next!)).toBe("Amanhã · 19:00");
  });
});
