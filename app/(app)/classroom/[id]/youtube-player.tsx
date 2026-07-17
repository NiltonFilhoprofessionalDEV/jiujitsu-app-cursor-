"use client";

import { useEffect, useRef, useState } from "react";
import { markLessonWatched } from "@/actions/classroom";
import { youtubeEmbedUrl } from "@/lib/youtube/parse";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: { playVideo?: () => void } }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: () => void;
          };
        },
      ) => { destroy: () => void };
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export function YoutubePlayer({
  videoId,
  orientation,
  title,
  lessonId,
  initiallyWatched = false,
}: {
  videoId: string;
  orientation: "horizontal" | "vertical";
  title: string;
  lessonId: string;
  initiallyWatched?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const markedRef = useRef(initiallyWatched);
  const playerRef = useRef<{ destroy: () => void } | null>(null);
  const containerId = useRef(
    `yt-player-${lessonId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
  ).current;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await loadYoutubeApi();
        if (cancelled || !window.YT?.Player) return;

        playerRef.current?.destroy();
        playerRef.current = new window.YT.Player(containerId, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onError: () => {
              if (!cancelled) setFailed(true);
            },
            onStateChange: (event) => {
              if (
                event.data === window.YT?.PlayerState.PLAYING &&
                !markedRef.current
              ) {
                markedRef.current = true;
                void markLessonWatched(lessonId);
              }
            },
          },
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void setup();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [containerId, lessonId, videoId]);

  if (failed) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Este vídeo não permite reprodução no app. Verifique se está público ou
        unlisted com embed liberado.
        <a
          href={youtubeEmbedUrl(videoId)}
          className="mt-3 inline-block text-[var(--action-red)] underline"
          target="_blank"
          rel="noreferrer"
        >
          Abrir no YouTube
        </a>
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
      <div id={containerId} title={title} className="h-full w-full" />
    </div>
  );
}
