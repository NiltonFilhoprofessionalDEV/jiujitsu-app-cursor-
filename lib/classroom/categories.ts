export const LESSON_CATEGORIES = [
  { value: "guarda", label: "Guarda" },
  { value: "passagem", label: "Passagem" },
  { value: "finalizacao", label: "Finalização" },
  { value: "defesa", label: "Defesa" },
] as const;

export type LessonCategory = (typeof LESSON_CATEGORIES)[number]["value"];

export function lessonCategoryLabel(
  category: LessonCategory | null | undefined,
): string | null {
  if (!category) return null;
  return LESSON_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
