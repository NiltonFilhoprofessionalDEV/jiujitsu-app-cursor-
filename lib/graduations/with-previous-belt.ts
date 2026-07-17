import type { GraduationRow } from "@/actions/graduations";

export type GraduationWithPrevious = GraduationRow & {
  previous_belt: string | null;
  previous_degree: number | null;
};

/**
 * Attaches the chronologically previous belt/degree for each history row.
 * Sorts per member by graduated_at ASC (then id) so same-day ties never reverse from→to.
 */
export function withPreviousBelt(
  graduations: GraduationRow[],
): GraduationWithPrevious[] {
  const byMember = new Map<string, GraduationRow[]>();

  for (const graduation of graduations) {
    const list = byMember.get(graduation.member_id) ?? [];
    list.push(graduation);
    byMember.set(graduation.member_id, list);
  }

  for (const list of byMember.values()) {
    list.sort((a, b) => {
      const byDate = a.graduated_at.localeCompare(b.graduated_at);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    });
  }

  return graduations.map((graduation) => {
    const siblings = byMember.get(graduation.member_id) ?? [];
    const index = siblings.findIndex((item) => item.id === graduation.id);
    const previous = index > 0 ? siblings[index - 1] : undefined;

    return {
      ...graduation,
      previous_belt: previous?.belt ?? null,
      previous_degree: previous?.degree ?? null,
    };
  });
}
