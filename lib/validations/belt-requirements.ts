import { z } from "zod";
import { BELT_OPTIONS, beltSchema } from "@/lib/validations/members";

export const beltRequirementRowSchema = z.object({
  belt: beltSchema,
  classes_per_degree: z.coerce
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo 1 aula")
    .max(500, "Máximo 500 aulas"),
});

export const saveBeltRequirementsSchema = z.object({
  requirements: z
    .array(beltRequirementRowSchema)
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.belt)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Faixa ${row.belt} duplicada`,
          });
        }
        seen.add(row.belt);
      }
    }),
});

export const ALL_CONFIGURABLE_BELTS = BELT_OPTIONS;

export type SaveBeltRequirementsInput = z.infer<
  typeof saveBeltRequirementsSchema
>;
