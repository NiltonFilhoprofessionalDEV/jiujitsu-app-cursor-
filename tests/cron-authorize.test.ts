import { afterEach, describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron/authorize";

describe("authorizeCronRequest", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
  });

  it("rejects when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    const request = new Request("http://localhost/api/cron/auto-sessions", {
      headers: { Authorization: "Bearer anything" },
    });
    expect(authorizeCronRequest(request)).toBe(false);
  });

  it("accepts matching Bearer token and trims whitespace", () => {
    process.env.CRON_SECRET = "  secret-value  \n";
    const request = new Request("http://localhost/api/cron/auto-sessions", {
      headers: { Authorization: "  Bearer secret-value  " },
    });
    expect(authorizeCronRequest(request)).toBe(true);
  });

  it("rejects mismatched token", () => {
    process.env.CRON_SECRET = "secret-value";
    const request = new Request("http://localhost/api/cron/auto-sessions", {
      headers: { Authorization: "Bearer wrong" },
    });
    expect(authorizeCronRequest(request)).toBe(false);
  });
});
