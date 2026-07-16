import { z } from "zod";

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
  notify_members: z
    .union([z.literal("on"), z.literal("true"), z.literal("1"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true" || value === "1"),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
