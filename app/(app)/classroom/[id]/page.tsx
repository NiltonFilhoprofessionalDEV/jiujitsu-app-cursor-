import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getVirtualLesson } from "@/actions/classroom";
import { getActiveMembership } from "@/lib/permissions/assert";
import { can } from "@/lib/permissions/capabilities";
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

  const { id } = await params;
  const lesson = await getVirtualLesson(id);
  if (!lesson) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/classroom"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Sala virtual
      </Link>

      <YoutubePlayer
        videoId={lesson.youtube_video_id}
        orientation={lesson.orientation}
        title={lesson.title}
      />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--bjj-text)]">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {lesson.description}
          </p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {lesson.class_name ? `${lesson.class_name} · ` : ""}
          Por {lesson.created_by_name}
        </p>
        <p className="text-xs text-muted-foreground">
          Se o vídeo não carregar: este vídeo não permite reprodução no app.
          Verifique se está público ou unlisted com embed liberado.
        </p>
      </header>
    </div>
  );
}
