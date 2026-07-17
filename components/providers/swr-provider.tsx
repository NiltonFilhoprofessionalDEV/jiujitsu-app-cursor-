"use client";

import { SWRConfig } from "swr";

const swrDefaults = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 8_000,
  errorRetryCount: 2,
  keepPreviousData: true,
} as const;

/** Client memory cache (stale-while-revalidate) for main app screens. */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrDefaults}>{children}</SWRConfig>;
}
