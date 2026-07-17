import { z } from "zod";

function optionalContactField(minLen: number, maxLen: number, label: string) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return;
      if (value.length < minLen) {
        ctx.addIssue({
          code: "custom",
          message: `${label} muito curto`,
        });
      }
      if (value.length > maxLen) {
        ctx.addIssue({
          code: "custom",
          message: `${label} muito longo`,
        });
      }
    })
    .transform((value) => (value === "" ? null : value));
}

export const updatePersonalProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(80, "Nome muito longo"),
  phone: optionalContactField(8, 30, "Telefone"),
  birth_date: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        ctx.addIssue({ code: "custom", message: "Data inválida" });
        return;
      }
      const d = new Date(`${value}T12:00:00`);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Data inválida" });
        return;
      }
      const min = new Date("1920-01-01T12:00:00");
      const max = new Date();
      if (d < min || d > max) {
        ctx.addIssue({
          code: "custom",
          message: "Data de nascimento inválida",
        });
      }
    })
    .transform((value) => (value === "" ? null : value)),
});

export const updateEmergencyContactSchema = z.object({
  emergency_contact_name: optionalContactField(2, 80, "Nome"),
  emergency_contact_phone: optionalContactField(8, 30, "Telefone"),
});

export type UpdatePersonalProfileInput = z.infer<
  typeof updatePersonalProfileSchema
>;
export type UpdateEmergencyContactInput = z.infer<
  typeof updateEmergencyContactSchema
>;
