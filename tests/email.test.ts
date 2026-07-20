import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("handles empty values", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts simple emails", () => {
    expect(isValidEmail("cliente@email.com")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("nao-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });
});

describe("isPlatformAdminEmail", () => {
  it("matches allowlist case-insensitively", () => {
    const previous = process.env.PLATFORM_ADMIN_EMAILS;
    process.env.PLATFORM_ADMIN_EMAILS = "Admin@Pulse.com, outro@x.com";
    expect(isPlatformAdminEmail("admin@pulse.com")).toBe(true);
    expect(isPlatformAdminEmail("outro@x.com")).toBe(true);
    expect(isPlatformAdminEmail("nao@x.com")).toBe(false);
    process.env.PLATFORM_ADMIN_EMAILS = previous;
  });
});
