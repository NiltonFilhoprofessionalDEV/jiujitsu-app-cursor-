import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value));

export const createAcademySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  phone: optionalString,
  email: optionalString,
  instagram: optionalString,
  city: optionalString,
  state: optionalString,
  address: optionalString,
  description: optionalString,
});

export const updateAcademySchema = createAcademySchema;

export const createUnitSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  address: optionalString,
  city: optionalString,
  state: optionalString,
  phone: optionalString,
});

export const updateUnitSchema = createUnitSchema.extend({
  id: z.string().uuid("Unidade inválida"),
  is_active: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true" || value === "on";
    }),
});

export type CreateAcademyInput = z.infer<typeof createAcademySchema>;
export type UpdateAcademyInput = z.infer<typeof updateAcademySchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
