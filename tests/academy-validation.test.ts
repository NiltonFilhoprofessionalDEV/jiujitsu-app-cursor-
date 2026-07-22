import { describe, expect, it } from "vitest";
import { createAcademySchema } from "@/lib/validations/academy";

describe("createAcademySchema", () => {
  it("accepts create-academy form without timezone field", () => {
    const parsed = createAcademySchema.safeParse({
      name: "Gracie Barra Centro",
      phone: "",
      email: "",
      instagram: "",
      city: "São Paulo",
      state: "SP",
      address: "",
      description: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Gracie Barra Centro");
      expect(parsed.data.timezone).toBeUndefined();
      expect(parsed.data.phone).toBeUndefined();
    }
  });

  it("requires academy name", () => {
    const parsed = createAcademySchema.safeParse({
      name: "",
      state: "SP",
    });
    expect(parsed.success).toBe(false);
  });

  it("does not crash when optional fields are undefined", () => {
    const parsed = createAcademySchema.safeParse({
      name: "Academia Teste",
    });
    expect(parsed.success).toBe(true);
  });
});
