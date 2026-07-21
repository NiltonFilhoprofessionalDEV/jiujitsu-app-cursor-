export type AutoSessionsResult = {
  opened: number;
  closed: number;
  skipped: number;
  errors: string[];
  /** Compact skip reasons for ops debugging (capped). */
  skipReasons: string[];
};
