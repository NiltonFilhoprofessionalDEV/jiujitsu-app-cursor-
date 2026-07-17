import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Play } from "lucide-react";

import { listClasses } from "@/actions/classes";
import { listVirtualLessons } from "@/actions/classroom";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import {
  LESSON_CATEGORIES,
  lessonCategoryLabel,
  youtubeThumbnailUrl,
  type LessonCategory,
} from "@/lib/classroom/categories";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { PageCreateFab } from "@/components/layout/page-create-fab";
import { EmptyState } from "@/components/ui/empty-state";
import { ClassroomFilters } from "./classroom-filters";
import { LessonFavoriteButton } from "./lesson-favorite-button";

function isLessonCategory(value: string | undefined): value is LessonCategory {
  return LESSON_CATEGORIES.some((c) => c.value === value);
}

export default async function ClassroomPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    category?: string;
    q?: string;
    favorites?: string;
  }>;
}) {
  let membership;
  try {
    membership = await getActiveMembership();
  } catch {
    redirect("/select-academy");
  }

  if (!can(membership.role, "view_virtual_lessons")) {
    redirect("/home");
  }

  const canManage = can(membership.role, "manage_virtual_lessons");
  const params = await searchParams;
  const classId = params.classId;
  const category = isLessonCategory(params.category)
    ? params.category
    : undefined;
  const q = params.q?.trim() || undefined;
  const favoritesOnly = params.favorites === "1";
  const hasActiveFilters = Boolean(
    q || classId || category || favoritesOnly,
  );

  const [lessons, classes] = await Promise.all([
    listVirtualLessons({
      classId,
      category,
      q,
      favoritesOnly,
    }),
    listClasses(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <BlackBeltTitle className="font-display text-3xl tracking-[0.06em] text-[var(--bjj-text)]">
          Galeria de vídeos
        </BlackBeltTitle>
        <p className="text-sm text-[var(--bjj-muted)]">
          Aulas em vídeo da academia
        </p>
      </header>

      <Suspense fallback={null}>
        <ClassroomFilters
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
          initial={{
            q: params.q,
            classId: params.classId,
            category: params.category,
            favorites: params.favorites,
          }}
        />
      </Suspense>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Vídeos
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {lessons.length}
          </p>
        </div>

        {lessons.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "Nenhum vídeo encontrado"
                : favoritesOnly
                  ? "Nenhum favorito ainda"
                  : "Nenhuma aula publicada"
            }
            description={
              hasActiveFilters
                ? "Ajuste a busca ou os filtros."
                : favoritesOnly
                  ? "Toque na estrela de um vídeo para salvá-lo aqui."
                  : "Links do YouTube publicados pela equipe aparecem aqui."
            }
            actionHref={
              canManage && !hasActiveFilters ? "/classroom/new" : undefined
            }
            actionLabel={
              canManage && !hasActiveFilters ? "Novo vídeo" : undefined
            }
          />
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--surface-shadow)] backdrop-blur-xl"
            >
              <Link
                href={`/classroom/${lesson.id}`}
                className="flex gap-3 p-3 transition hover:bg-muted/60"
              >
                <span className="relative h-20 w-[7.5rem] shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={youtubeThumbnailUrl(lesson.youtube_video_id)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55">
                      <Play className="h-3.5 w-3.5 fill-white text-white" />
                    </span>
                  </span>
                </span>
                <div className="min-w-0 flex-1 py-0.5 pr-10">
                  <p className="line-clamp-2 font-semibold text-foreground">
                    {lesson.title}
                  </p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {lessonCategoryLabel(lesson.category) ?? "Sem categoria"}
                    {lesson.class_name ? ` · ${lesson.class_name}` : ""}
                    {lesson.visibility === "class" ? " · Só turma" : ""}
                  </p>
                </div>
              </Link>
              <div className="absolute right-2 top-2">
                <LessonFavoriteButton
                  lessonId={lesson.id}
                  initialFavorite={lesson.is_favorite}
                />
              </div>
            </div>
          ))
        )}
      </section>

      {canManage ? (
        <PageCreateFab href="/classroom/new" label="Novo vídeo" />
      ) : null}
    </div>
  );
}
