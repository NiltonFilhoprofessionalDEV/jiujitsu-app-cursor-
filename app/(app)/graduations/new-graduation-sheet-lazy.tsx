"use client";

import dynamic from "next/dynamic";

export const NewGraduationSheetLazy = dynamic(
  () =>
    import("./new-graduation-sheet").then((m) => ({
      default: m.NewGraduationSheet,
    })),
  { ssr: false },
);
