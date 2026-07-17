export type HistoryBeltRow = {
  id: string;
  belt: string;
  degree: number;
  graduated_at: string;
};

/**
 * Picks the latest graduation for a member (date desc, then id desc).
 * Returns null when history is empty.
 */
export function pickLatestGraduation(
  rows: readonly HistoryBeltRow[],
): HistoryBeltRow | null {
  if (rows.length === 0) return null;

  return [...rows].sort((a, b) => {
    const byDate = b.graduated_at.localeCompare(a.graduated_at);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  })[0]!;
}

export function memberBeltPatchFromLatest(
  latest: HistoryBeltRow | null,
): { current_belt: string; current_degree: number } {
  if (!latest) {
    return { current_belt: "Branca", current_degree: 0 };
  }
  return {
    current_belt: latest.belt,
    current_degree: latest.degree,
  };
}
