"use client";

import { useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube/parse";
import { cn } from "@/lib/utils";

export function YoutubePlayer({
  videoId,
  orientation,
  title,
}: {
  videoId: string;
  orientation: "horizontal" | "vertical";
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = youtubeEmbedUrl(videoId);

  if (failed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Este vídeo não permite reprodução no app. Verifique se está público ou
        unlisted com embed liberado.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full overflow-hidden rounded-2xl border border-border bg-black",
        orientation === "horizontal"
          ? "aspect-video max-w-full"
          : "aspect-[9/16] max-h-[70vh] max-w-[min(100%,360px)]",
      )}
    >
      <iframe
        title={title}
        src={src}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onError={() => setFailed(true)}
      />
    </div>
  );
}
