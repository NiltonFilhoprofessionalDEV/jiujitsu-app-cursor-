import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getVirtualLesson,
  listLessonComments,
} from "@/actions/classroom";
import { BlackBeltTitle } from "@/components/brand/black-belt-title";
import { lessonCategoryLabel } from "@/lib/classroom/categories";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
import { LessonActionsMenu } from "../lesson-actions-menu";
import { LessonComments } from "../lesson-comments";
import { LessonFavoriteButton } from "../lesson-favorite-button";
import { LessonLikeButton } from "../lesson-like-button";
import { YoutubePlayer } from "./youtube-player";

export default async function ClassroomLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  const [lesson, comments] = await Promise.all([
    getVirtualLesson(id),
    listLessonComments(id).catch(() => []),
  ]);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/classroom"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Galeria
        </Link>
        {canManage ? (
          <LessonActionsMenu lessonId={lesson.id} title={lesson.title} />
        ) : null}
      </div>

      <YoutubePlayer
        videoId={lesson.youtube_video_id}
        orientation={lesson.orientation}
        title={lesson.title}
        lessonId={lesson.id}
        initiallyWatched={lesson.is_watched}
      />

      <div className="flex items-center gap-2">
        <LessonLikeButton
          lessonId={lesson.id}
          initialLiked={lesson.is_liked}
          initialCount={lesson.like_count}
        />
        <LessonFavoriteButton
          lessonId={lesson.id}
          initialFavorite={lesson.is_favorite}
        />
        {lesson.is_watched ? (
          <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Assistido
          </span>
        ) : null}
      </div>

      <header className="space-y-2">
        <BlackBeltTitle className="font-display text-2xl tracking-[0.06em] text-[var(--bjj-text)]">
          {lesson.title}
        </BlackBeltTitle>
        {lesson.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {lesson.description}
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {lessonCategoryLabel(lesson.category)
            ? `${lessonCategoryLabel(lesson.category)} · `
            : ""}
          {lesson.class_name ? `${lesson.class_name} · ` : ""}
          Por {lesson.created_by_name}
          {lesson.like_count > 0
            ? ` · ${lesson.like_count} curtida${lesson.like_count === 1 ? "" : "s"}`
            : ""}
        </p>
      </header>

      <LessonComments lessonId={lesson.id} comments={comments} />
    </div>
  );
}
