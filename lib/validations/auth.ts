import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const signupSchema = loginSchema.extend({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Senha atual deve ter no mínimo 6 caracteres"),
    newPassword: z
      .string()
      .min(6, "Nova senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
