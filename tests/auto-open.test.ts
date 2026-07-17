import { describe, expect, it } from "vitest";
import {
  resolveTimezone,
  shouldAutoClose,
  shouldAutoOpen,
  zonedLocalToUtc,
  zonedParts,
} from "@/lib/sessions/auto-open";

describe("resolveTimezone", () => {
  it("prefers unit over academy", () => {
    expect(resolveTimezone("America/Manaus", "America/Sao_Paulo")).toBe(
      "America/Manaus",
    );
  });

  it("falls back to academy then Sao Paulo", () => {
    expect(resolveTimezone(null, "America/Fortaleza")).toBe(
      "America/Fortaleza",
    );
    expect(resolveTimezone(null, null)).toBe("America/Sao_Paulo");
  });
});

describe("zonedLocalToUtc + shouldAutoOpen", () => {
  it("opens inside lead window on matching weekday (Sao Paulo)", () => {
    // Monday 2026-07-20 18:40 BRT = 21:40 UTC (BRT = UTC-3)
    const now = new Date("2026-07-20T21:40:00.000Z");
    const parts = zonedParts(now, "America/Sao_Paulo");
    expect(parts.weekday).toBe(1);
    expect(parts.dateStr).toBe("2026-07-20");

    expect(
      shouldAutoOpen({
        now,
        timeZone: "America/Sao_Paulo",
        weekday: 1,
        startTime: "19:00:00",
        endTime: "20:00:00",
        leadMinutes: 30,
      }),
    ).toBe(true);
  });

  it("does not open before lead window", () => {
    // 18:20 BRT — 40 min before 19:00 with lead 30
    const now = new Date("2026-07-20T21:20:00.000Z");
    expect(
      shouldAutoOpen({
        now,
        timeZone: "America/Sao_Paulo",
        weekday: 1,
        startTime: "19:00:00",
        endTime: "20:00:00",
        leadMinutes: 30,
      }),
    ).toBe(false);
  });

  it("does not open after class end", () => {
    const now = new Date("2026-07-20T23:05:00.000Z"); // 20:05 BRT
    expect(
      shouldAutoOpen({
        now,
        timeZone: "America/Sao_Paulo",
        weekday: 1,
        startTime: "19:00:00",
        endTime: "20:00:00",
        leadMinutes: 30,
      }),
    ).toBe(false);
  });

  it("does not open on wrong weekday", () => {
    const now = new Date("2026-07-21T21:40:00.000Z"); // Tuesday
    expect(
      shouldAutoOpen({
        now,
        timeZone: "America/Sao_Paulo",
        weekday: 1,
        startTime: "19:00:00",
        endTime: "20:00:00",
        leadMinutes: 30,
      }),
    ).toBe(false);
  });
});

describe("shouldAutoClose", () => {
  it("closes after end + grace", () => {
    // end 20:00 BRT + 15 grace = 20:15 BRT = 23:15 UTC
    const now = new Date("2026-07-20T23:15:00.000Z");
    expect(
      shouldAutoClose({
        now,
        timeZone: "America/Sao_Paulo",
        sessionDate: "2026-07-20",
        endTime: "20:00:00",
        graceMinutes: 15,
      }),
    ).toBe(true);
  });

  it("does not close before grace ends", () => {
    const now = new Date("2026-07-20T23:10:00.000Z"); // 20:10 BRT
    expect(
      shouldAutoClose({
        now,
        timeZone: "America/Sao_Paulo",
        sessionDate: "2026-07-20",
        endTime: "20:00:00",
        graceMinutes: 15,
      }),
    ).toBe(false);
  });

  it("round-trips local wall time", () => {
    const utc = zonedLocalToUtc(
      "2026-07-20",
      "19:00:00",
      "America/Sao_Paulo",
    );
    const parts = zonedParts(utc, "America/Sao_Paulo");
    expect(parts.hour).toBe(19);
    expect(parts.minute).toBe(0);
    expect(parts.dateStr).toBe("2026-07-20");
  });
});
