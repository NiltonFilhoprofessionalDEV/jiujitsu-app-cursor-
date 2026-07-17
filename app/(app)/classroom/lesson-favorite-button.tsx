"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { toggleLessonFavorite } from "@/actions/classroom";
import { cn } from "@/lib/utils";

export function LessonFavoriteButton({
  lessonId,
  initialFavorite,
  className,
}: {
  lessonId: string;
  initialFavorite: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={favorited}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground transition hover:text-foreground disabled:opacity-60",
        favorited && "border-amber-500/40 text-amber-400",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const previous = favorited;
        setFavorited(!previous);
        startTransition(async () => {
          const result = await toggleLessonFavorite(lessonId);
          if (result.error) {
            setFavorited(previous);
            toast.error(result.error);
            return;
          }
          setFavorited(result.favorited);
        });
      }}
    >
      <Star
        className={cn("h-4 w-4", favorited && "fill-current")}
      />
    </button>
  );
}
