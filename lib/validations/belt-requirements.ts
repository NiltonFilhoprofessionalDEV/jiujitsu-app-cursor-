import { z } from "zod";
import { BELT_OPTIONS, beltSchema } from "@/lib/validations/members";
import { DEFAULT_BELT_AGE_RANGES } from "@/lib/belts/options";

const optionalAge = z.preprocess((value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}, z.number().int().min(0).max(100).nullable());

export const beltRequirementRowSchema = z.object({
  belt: beltSchema,
  classes_per_degree: z.coerce
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo 1 aula")
    .max(500, "Máximo 500 aulas"),
  min_age: optionalAge,
  max_age: optionalAge,
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
        if (
          row.min_age != null &&
          row.max_age != null &&
          row.min_age > row.max_age
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${row.belt}: idade mínima maior que a máxima`,
          });
        }
      }
    }),
});

export const ALL_CONFIGURABLE_BELTS = BELT_OPTIONS;

export function defaultAgesForBelt(belt: string): {
  minAge: number;
  maxAge: number | "";
} {
  const d = DEFAULT_BELT_AGE_RANGES[belt];
  return {
    minAge: d?.minAge ?? 4,
    maxAge: d?.maxAge ?? "",
  };
}

export type SaveBeltRequirementsInput = z.infer<
  typeof saveBeltRequirementsSchema
>;
