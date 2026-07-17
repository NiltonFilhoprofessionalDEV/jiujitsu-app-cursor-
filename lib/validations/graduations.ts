import { z } from "zod";
import { beltSchema, degreeSchema } from "@/lib/validations/members";

const optionalNotes = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const optionalGraduatedAt = z
  .string()
  .trim()
  .optional()
  .transform((value) =>
    value === "" || value === undefined ? undefined : value,
  );

export const createGraduationSchema = z.object({
  member_id: z.string().uuid("Membro inválido"),
  belt: beltSchema,
  degree: degreeSchema,
  notes: optionalNotes,
  graduated_at: optionalGraduatedAt,
});

export const updateGraduationSchema = z.object({
  id: z.string().uuid("Graduação inválida"),
  belt: beltSchema,
  degree: degreeSchema,
  notes: optionalNotes,
  graduated_at: z
    .string()
    .trim()
    .min(1, "Data obrigatória")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export const deleteGraduationSchema = z.object({
  id: z.string().uuid("Graduação inválida"),
});

export type CreateGraduationInput = z.infer<typeof createGraduationSchema>;
export type UpdateGraduationInput = z.infer<typeof updateGraduationSchema>;
export type DeleteGraduationInput = z.infer<typeof deleteGraduationSchema>;
