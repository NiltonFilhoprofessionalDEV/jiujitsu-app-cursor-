export type GraduationHistoryInsert = {
  member_id: string;
  belt: string;
  degree: number;
  awarded_by: string | null;
  notes: string | null;
  graduated_at?: string;
};

export type GraduationMemberPatch = {
  current_belt: string;
  current_degree: number;
};

export type BuildGraduationUpdateInput = {
  memberId: string;
  belt: string;
  degree: number;
  awardedBy: string | null;
  notes?: string | null;
  graduatedAt?: string;
  /** Existing history is never mutated — only used for callers that need context. */
  previousHistory?: ReadonlyArray<Readonly<GraduationHistoryInsert>>;
};

export type BuildGraduationUpdateResult = {
  history: GraduationHistoryInsert;
  memberPatch: GraduationMemberPatch;
};

/**
 * Builds an append-only graduation payload.
 * Never mutates `previousHistory` or any prior entries.
 */
export function buildGraduationUpdate(
  input: BuildGraduationUpdateInput,
): BuildGraduationUpdateResult {
  // Touch previousHistory only via length to prove we do not write to it.
  void input.previousHistory?.length;

  const history: GraduationHistoryInsert = {
    member_id: input.memberId,
    belt: input.belt,
    degree: input.degree,
    awarded_by: input.awardedBy,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };

  if (input.graduatedAt) {
    history.graduated_at = input.graduatedAt;
  }

  return {
    history,
    memberPatch: {
      current_belt: input.belt,
      current_degree: input.degree,
    },
  };
}
