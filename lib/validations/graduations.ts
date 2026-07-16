import { z } from "zod";
import { beltSchema, degreeSchema } from "@/lib/validations/members";

const optionalNotes = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const createGraduationSchema = z.object({
  member_id: z.string().uuid("Membro inválido"),
  belt: beltSchema,
  degree: degreeSchema,
  notes: optionalNotes,
  graduated_at: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value)),
});

export type CreateGraduationInput = z.infer<typeof createGraduationSchema>;
