import type { TrophyMaterial } from "@/lib/journey/milestones";

export const MATERIAL_STYLES: Record<
  TrophyMaterial,
  { unlocked: string; locked: string; icon: string }
> = {
  stone: {
    unlocked:
      "bg-gradient-to-b from-stone-400 to-stone-600 text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
    locked: "bg-stone-500/15 text-stone-500",
    icon: "text-stone-100",
  },
  wood: {
    unlocked:
      "bg-gradient-to-b from-amber-700 to-amber-950 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
    locked: "bg-amber-800/15 text-amber-700",
    icon: "text-amber-100",
  },
  iron: {
    unlocked:
      "bg-gradient-to-b from-slate-300 to-slate-600 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
    locked: "bg-slate-500/15 text-slate-500",
    icon: "text-slate-50",
  },
  silver: {
    unlocked:
      "bg-gradient-to-b from-zinc-100 to-zinc-400 text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
    locked: "bg-zinc-400/15 text-zinc-500",
    icon: "text-zinc-800",
  },
  gold: {
    unlocked:
      "bg-gradient-to-b from-yellow-300 to-amber-600 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]",
    locked: "bg-yellow-500/15 text-yellow-700",
    icon: "text-amber-950",
  },
  diamond: {
    unlocked:
      "bg-gradient-to-b from-cyan-200 to-sky-500 text-sky-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
    locked: "bg-sky-400/15 text-sky-600",
    icon: "text-sky-950",
  },
};
