import { describe, expect, it } from "vitest";
import { inferNotificationKind } from "@/lib/notifications/kind";

describe("inferNotificationKind", () => {
  it("detects graduation", () => {
    expect(inferNotificationKind("Nova graduação")).toBe("graduation");
  });

  it("detects attendance", () => {
    expect(inferNotificationKind("Presença aprovada")).toBe("attendance");
  });

  it("detects trophy", () => {
    expect(inferNotificationKind("Novo troféu!")).toBe("trophy");
  });

  it("detects birthday", () => {
    expect(inferNotificationKind("Aniversário hoje")).toBe("birthday");
  });

  it("falls back to general", () => {
    expect(inferNotificationKind("Olá")).toBe("general");
  });
});
