const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeId(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(input)
      ? input
      : `https://${input}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && YOUTUBE_ID_RE.test(v)) return v;

      const parts = url.pathname.split("/").filter(Boolean);
      if (
        (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") &&
        parts[1] &&
        YOUTUBE_ID_RE.test(parts[1])
      ) {
        return parts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
