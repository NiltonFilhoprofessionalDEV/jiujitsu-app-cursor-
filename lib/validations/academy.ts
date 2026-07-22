import { z } from "zod";

/** Optional form string: accepts undefined/null/empty → undefined. */
const optionalString = z.preprocess((value) => {
  if (value == null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

export const createAcademySchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z.string().trim().min(1, "Nome é obrigatório"),
  ),
  phone: optionalString,
  email: optionalString,
  instagram: optionalString,
  city: optionalString,
  state: optionalString,
  address: optionalString,
  description: optionalString,
  timezone: optionalString,
});

export const updateAcademySchema = createAcademySchema;

export const createUnitSchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z.string().trim().min(1, "Nome é obrigatório"),
  ),
  address: optionalString,
  city: optionalString,
  state: optionalString,
  phone: optionalString,
  timezone: optionalString,
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
