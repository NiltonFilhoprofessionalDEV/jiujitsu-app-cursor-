import { z } from "zod";
import { extractYoutubeId } from "@/lib/youtube/parse";

const uuidOrEmpty = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().uuid().optional());

export const createVirtualLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Título é obrigatório")
      .max(120, "Título muito longo"),
    description: z
      .string()
      .trim()
      .max(2000, "Descrição muito longa")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    youtube_url: z
      .string()
      .trim()
      .min(1, "Link do YouTube é obrigatório")
      .max(500, "Link muito longo"),
    orientation: z.enum(["horizontal", "vertical"], {
      message: "Orientação inválida",
    }),
    visibility: z.enum(["academy", "class"], {
      message: "Visibilidade inválida",
    }),
    class_id: uuidOrEmpty,
  })
  .superRefine((data, ctx) => {
    const videoId = extractYoutubeId(data.youtube_url);
    if (!videoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtube_url"],
        message: "Link do YouTube inválido",
      });
    }
    if (data.visibility === "class" && !data.class_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["class_id"],
        message: "Selecione a turma para visibilidade restrita",
      });
    }
  })
  .transform((data) => {
    const youtube_video_id = extractYoutubeId(data.youtube_url)!;
    return {
      ...data,
      youtube_video_id,
      description: data.description ?? null,
      class_id: data.class_id ?? null,
    };
  });

export type CreateVirtualLessonInput = z.infer<
  typeof createVirtualLessonSchema
>;
