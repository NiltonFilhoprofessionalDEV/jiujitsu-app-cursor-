"use client";

import dynamic from "next/dynamic";

export const StatsChartsLazy = dynamic(
  () =>
    import("@/components/dashboard/stats-charts").then((m) => ({
      default: m.StatsCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-2xl bg-muted" aria-hidden />
    ),
  },
);
