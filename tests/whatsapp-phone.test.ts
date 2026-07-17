import { describe, expect, it } from "vitest";
import { toWhatsAppE164, whatsappChatUrl } from "@/lib/phone/whatsapp";

describe("whatsapp phone helpers", () => {
  it("adds Brazil country code for local mobiles", () => {
    expect(toWhatsAppE164("11999998888")).toBe("5511999998888");
    expect(toWhatsAppE164("(11) 99999-8888")).toBe("5511999998888");
  });

  it("keeps existing 55 prefix", () => {
    expect(toWhatsAppE164("5511999998888")).toBe("5511999998888");
  });

  it("builds directed chat url", () => {
    const url = whatsappChatUrl("11999998888", "Olá");
    expect(url).toBe(
      `https://wa.me/5511999998888?text=${encodeURIComponent("Olá")}`,
    );
  });
});
