import { beltSlug } from "@/lib/belts/options";

/** Public path for belt+degree artwork: /belts/{slug}-d{n}.png */
export function beltDegreeImageSrc(belt: string, degree: number): string {
  const d = Math.max(0, Math.min(4, Math.trunc(degree)));
  return `/belts/${beltSlug(belt)}-d${d}.png`;
}

export function beltDegreeCode(belt: string, degree: number): string {
  return `belt_${beltSlug(belt)}_d${Math.max(0, Math.min(4, Math.trunc(degree)))}`;
}
