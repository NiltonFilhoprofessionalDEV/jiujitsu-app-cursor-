import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value));

export const memberRoleSchema = z.enum([
  "owner",
  "administrator",
  "instructor",
  "assistant_instructor",
  "student",
  "guardian",
]);

export const memberStatusSchema = z.enum(["active", "inactive", "suspended"]);

export const BELT_OPTIONS = [
  "Branca",
  "Cinza",
  "Amarela",
  "Laranja",
  "Verde",
  "Azul",
  "Roxa",
  "Marrom",
  "Preta",
  "Coral",
  "Vermelha",
] as const;

export const beltSchema = z.enum(BELT_OPTIONS);

export const degreeSchema = z.coerce
  .number()
  .int("Grau deve ser um número inteiro")
  .min(0, "Grau mínimo é 0")
  .max(10, "Grau máximo é 10");

const optionalBelt = optionalString.pipe(beltSchema.optional());

export const createMemberByEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .min(1, "E-mail é obrigatório"),
  role: memberRoleSchema.default("student"),
  status: memberStatusSchema.default("active"),
  current_belt: optionalBelt,
  current_degree: z
    .union([z.literal(""), degreeSchema])
    .optional()
    .transform((value) => (value === "" || value === undefined ? 0 : value)),
  emergency_contact_name: optionalString,
  emergency_contact_phone: optionalString,
  medical_notes: optionalString,
});

export const updateMemberSchema = z.object({
  id: z.string().uuid("Membro inválido"),
  role: memberRoleSchema.optional(),
  status: memberStatusSchema.optional(),
  current_belt: z
    .union([beltSchema, z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === "" || value === null) return null;
      return value;
    }),
  current_degree: degreeSchema.optional(),
  emergency_contact_name: optionalString.nullable().optional(),
  emergency_contact_phone: optionalString.nullable().optional(),
  medical_notes: optionalString.nullable().optional(),
});

export const listMembersFilterSchema = z.object({
  role: optionalString.pipe(memberRoleSchema.optional()),
  status: optionalString.pipe(memberStatusSchema.optional()),
  belt: optionalBelt,
});

export type CreateMemberByEmailInput = z.infer<typeof createMemberByEmailSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ListMembersFilter = z.infer<typeof listMembersFilterSchema>;
