import { z } from "zod";

export const createInviteSchema = z.object({
  role: z.enum(["student", "guardian", "assistant_instructor", "instructor"]),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(7),
  maxUses: z.coerce.number().int().min(1).max(1000).default(100),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
