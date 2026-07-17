import { z } from "zod";

const optionalClassId = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return value;
  });

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(120, "Título muito longo"),
  description: z
    .string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(2000, "Descrição muito longa"),
  class_id: optionalClassId,
  notify_members: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.boolean()])
    .optional()
    .transform(
      (value) =>
        value === true || value === "on" || value === "true" || value === "1",
    ),
});

export const updateAnnouncementSchema = z.object({
  id: z.string().uuid("Aviso inválido"),
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(120, "Título muito longo"),
  description: z
    .string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(2000, "Descrição muito longa"),
  class_id: optionalClassId,
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
