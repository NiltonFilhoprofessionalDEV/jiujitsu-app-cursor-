"use client";

import { beltNeedsDarkInk, beltSwatch } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

export function BeltPill({
  belt,
  degree,
  className,
}: {
  belt: string;
  degree?: number;
  className?: string;
}) {
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  const isBlack = belt === "Preta";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        darkInk ? "text-neutral-900" : "text-white",
        className,
      )}
      style={{
        background: swatch,
        boxShadow: isBlack
          ? "inset 0 0 0 1px rgba(255,255,255,0.18)"
          : darkInk
            ? "inset 0 0 0 1px rgba(0,0,0,0.08)"
            : undefined,
      }}
    >
      {belt}
      {typeof degree === "number" && degree > 0 ? ` · ${degree}º` : ""}
    </span>
  );
}
