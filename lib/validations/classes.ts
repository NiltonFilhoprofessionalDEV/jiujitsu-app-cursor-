import { z } from "zod";
import { beltSchema } from "@/lib/validations/members";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value));

const optionalUuid = optionalString.pipe(z.string().uuid().optional());

const optionalAge = z
  .union([
    z.literal(""),
    z.coerce.number().int().min(0, "Idade inválida").max(120, "Idade inválida"),
  ])
  .optional()
  .transform((value) =>
    value === "" || value === undefined ? undefined : value,
  );

const optionalBelt = z
  .union([beltSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return value;
  });

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Horário inválido (HH:MM)");

const booleanFromForm = z
  .union([
    z.boolean(),
    z.literal("true"),
    z.literal("false"),
    z.literal("on"),
    z.literal(""),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") return undefined;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "on";
  });

export const weekdaySchema = z.coerce
  .number()
  .int()
  .min(0, "Dia da semana inválido")
  .max(6, "Dia da semana inválido");

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  description: optionalString,
  unit_id: optionalUuid,
  minimum_age: optionalAge,
  maximum_age: optionalAge,
  minimum_belt: optionalBelt,
  maximum_belt: optionalBelt,
  is_active: booleanFromForm.transform((value) => value ?? true),
});

export const updateClassSchema = createClassSchema.extend({
  id: z.string().uuid("Turma inválida"),
  is_active: booleanFromForm,
});

export const createScheduleSchema = z
  .object({
    class_id: z.string().uuid("Turma inválida"),
    weekday: weekdaySchema,
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "Horário de início deve ser anterior ao fim",
    path: ["end_time"],
  });

export const createSchedulesBulkSchema = z
  .object({
    class_id: z.string().uuid("Turma inválida"),
    weekdays: z
      .array(weekdaySchema)
      .min(1, "Selecione pelo menos um dia")
      .max(7),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "Horário de início deve ser anterior ao fim",
    path: ["end_time"],
  });

export const updateScheduleSchema = z
  .object({
    id: z.string().uuid("Horário inválido"),
    weekday: weekdaySchema,
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((data) => data.start_time < data.end_time, {
    message: "Horário de início deve ser anterior ao fim",
    path: ["end_time"],
  });

export const updateScheduleAutoOpenSchema = z.object({
  id: z.string().uuid("Horário inválido"),
  class_id: z.string().uuid("Turma inválida"),
  auto_open_enabled: booleanFromForm.transform((value) => value ?? false),
  auto_open_lead_minutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(120, "Máximo 120 minutos")
    .default(30),
  auto_close_grace_minutes: z.coerce
    .number()
    .int()
    .min(0, "Mínimo 0 minutos")
    .max(60, "Máximo 60 minutos")
    .default(15),
});

/** Class-level automation: professor + apply same auto rules to all schedules. */
export const saveClassAutomationSchema = z.object({
  class_id: z.string().uuid("Turma inválida"),
  default_instructor_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value)),
  auto_open_enabled: booleanFromForm.transform((value) => value ?? false),
  auto_open_lead_minutes: z.coerce
    .number()
    .int()
    .min(5, "Mínimo 5 minutos")
    .max(120, "Máximo 120 minutos")
    .default(30),
  auto_close_grace_minutes: z.coerce
    .number()
    .int()
    .min(0, "Mínimo 0 minutos")
    .max(60, "Máximo 60 minutos")
    .default(15),
});

export const duplicateScheduleSchema = z.object({
  id: z.string().uuid("Horário inválido"),
  class_id: z.string().uuid("Turma inválida"),
  weekdays: z
    .array(weekdaySchema)
    .min(1, "Selecione pelo menos um dia")
    .max(7),
});

export const copySchedulesFromClassSchema = z.object({
  class_id: z.string().uuid("Turma inválida"),
  source_class_id: z.string().uuid("Turma de origem inválida"),
  replace_existing: booleanFromForm.transform((value) => value ?? false),
});

export const upsertScheduleDayOverrideSchema = z
  .object({
    class_id: z.string().uuid("Turma inválida"),
    schedule_id: z.string().uuid("Horário inválido"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    mode: z.enum(["cancel", "substitute"]),
    substitute_instructor_id: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value === "" || value === undefined ? null : value)),
    note: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.mode === "substitute" && !data.substitute_instructor_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escolha o professor substituto.",
        path: ["substitute_instructor_id"],
      });
    }
  });

export const deleteScheduleDayOverrideSchema = z.object({
  id: z.string().uuid("Exceção inválida"),
  class_id: z.string().uuid("Turma inválida"),
});

export const updateClassDefaultInstructorSchema = z.object({
  class_id: z.string().uuid("Turma inválida"),
  default_instructor_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .transform((value) => (value === "" || value === null ? null : value)),
});

export const deleteScheduleSchema = z.object({
  id: z.string().uuid("Horário inválido"),
  class_id: z.string().uuid("Turma inválida"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CreateSchedulesBulkInput = z.infer<typeof createSchedulesBulkSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type UpdateScheduleAutoOpenInput = z.infer<
  typeof updateScheduleAutoOpenSchema
>;
export type SaveClassAutomationInput = z.infer<typeof saveClassAutomationSchema>;
export type UpdateClassDefaultInstructorInput = z.infer<
  typeof updateClassDefaultInstructorSchema
>;
export type UpsertScheduleDayOverrideInput = z.infer<
  typeof upsertScheduleDayOverrideSchema
>;
