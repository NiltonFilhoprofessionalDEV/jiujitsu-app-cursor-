"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { toggleLessonLike } from "@/actions/classroom";
import { cn } from "@/lib/utils";

export function LessonLikeButton({
  lessonId,
  initialLiked,
  initialCount,
  className,
}: {
  lessonId: string;
  initialLiked: boolean;
  initialCount: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={liked ? "Remover curtida" : "Curtir vídeo"}
      aria-pressed={liked}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-60",
        liked && "border-[var(--action-red)]/40 text-[var(--action-red)]",
        className,
      )}
      onClick={() => {
        const prevLiked = liked;
        const prevCount = count;
        setLiked(!prevLiked);
        setCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
        startTransition(async () => {
          const result = await toggleLessonLike(lessonId);
          if (result.error) {
            setLiked(prevLiked);
            setCount(prevCount);
            toast.error(result.error);
            return;
          }
          setLiked(result.liked);
          setCount(result.like_count);
        });
      }}
    >
      <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
