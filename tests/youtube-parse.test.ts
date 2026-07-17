import { describe, it, expect } from "vitest";
import { extractYoutubeId } from "@/lib/youtube/parse";

describe("extractYoutubeId", () => {
  it("parses watch URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be short links", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("parses shorts URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses embed URLs", () => {
    expect(
      extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URLs", () => {
    expect(extractYoutubeId("https://example.com/video")).toBeNull();
    expect(extractYoutubeId("not-a-url")).toBeNull();
    expect(extractYoutubeId("")).toBeNull();
  });
});
