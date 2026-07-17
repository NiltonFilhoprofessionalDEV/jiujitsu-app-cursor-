"use client";

import { useEffect, useState } from "react";
import { HomeDashboardBodyClient } from "@/components/home/home-dashboard-client";

/** Full dashboard only on lg+ — phones never call getDashboardData. */
export function HomeDesktopGate({
  canGraduate,
  canAnnounce,
  canAddVideo,
}: {
  canGraduate: boolean;
  canAnnounce: boolean;
  canAddVideo: boolean;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="hidden lg:block">
      {enabled ? (
        <div className="space-y-6">
          <HomeDashboardBodyClient
            canGraduate={canGraduate}
            canAnnounce={canAnnounce}
            canAddVideo={canAddVideo}
          />
        </div>
      ) : (
        <div
          className="space-y-4"
          aria-busy="true"
          aria-label="Carregando painel"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      )}
    </div>
  );
}
