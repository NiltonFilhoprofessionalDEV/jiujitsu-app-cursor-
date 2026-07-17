"use client";

import dynamic from "next/dynamic";

export const NewAnnouncementSheetLazy = dynamic(
  () =>
    import("./new-announcement-sheet").then((m) => ({
      default: m.NewAnnouncementSheet,
    })),
  { ssr: false },
);
