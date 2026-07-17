export type TrophyMaterial =
  | "stone"
  | "wood"
  | "iron"
  | "silver"
  | "gold"
  | "diamond";

export type JourneyTrack = "student" | "teaching";

export type JourneyMilestone = {
  code: string;
  threshold: number;
  label: string;
  material: TrophyMaterial;
  materialLabel: string;
  track: JourneyTrack;
};

const MATERIALS: Array<{
  material: TrophyMaterial;
  materialLabel: string;
  threshold: number;
}> = [
  { material: "wood", materialLabel: "Madeira", threshold: 5 },
  { material: "stone", materialLabel: "Pedra", threshold: 10 },
  { material: "iron", materialLabel: "Ferro", threshold: 25 },
  { material: "silver", materialLabel: "Prata", threshold: 50 },
  { material: "gold", materialLabel: "Ouro", threshold: 100 },
  { material: "diamond", materialLabel: "Diamante", threshold: 200 },
];

function buildMilestones(
  track: JourneyTrack,
  codePrefix: string,
  labelSuffix: string,
): JourneyMilestone[] {
  return MATERIALS.map((m) => ({
    code: `${codePrefix}_${m.threshold}`,
    threshold: m.threshold,
    label: `${m.threshold} ${labelSuffix}`,
    material: m.material,
    materialLabel: m.materialLabel,
    track,
  }));
}

/** Presenças como aluno. */
export const STUDENT_MILESTONES = buildMilestones(
  "student",
  "classes",
  "aulas",
);

/** Sessões finalizadas como professor. */
export const TEACHING_MILESTONES = buildMilestones(
  "teaching",
  "taught",
  "aulas dadas",
);

export const ALL_MILESTONES: JourneyMilestone[] = [
  ...STUDENT_MILESTONES,
  ...TEACHING_MILESTONES,
];

/** @deprecated use STUDENT_MILESTONES */
export const JOURNEY_MILESTONES = STUDENT_MILESTONES;

export function milestonesForTrack(track: JourneyTrack): JourneyMilestone[] {
  return track === "teaching" ? TEACHING_MILESTONES : STUDENT_MILESTONES;
}

export function milestoneCode(threshold: number): string {
  return `classes_${threshold}`;
}

export function nextMilestone(
  classCount: number,
  track: JourneyTrack = "student",
): JourneyMilestone | null {
  return (
    milestonesForTrack(track).find((m) => classCount < m.threshold) ?? null
  );
}

export function trophyTitle(milestone: JourneyMilestone): string {
  return `Troféu de ${milestone.materialLabel}`;
}

export function findMilestoneByCode(code: string): JourneyMilestone | undefined {
  return ALL_MILESTONES.find((m) => m.code === code);
}
