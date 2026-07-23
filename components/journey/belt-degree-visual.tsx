"use client";

import { useState } from "react";
import { beltSwatch, beltNeedsDarkInk } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  md: "h-14 w-14 sm:h-12 sm:w-12",
  lg: "h-20 w-20 sm:h-16 sm:w-16",
  /** Full-bleed hero — matches trophy celebration scale */
  hero: "h-[min(72vh,96vw)] w-[min(72vh,96vw)] max-h-[min(72vh,720px)] max-w-[min(96vw,720px)] drop-shadow-[0_28px_90px_rgba(0,0,0,0.8)]",
} as const;

export function BeltDegreeVisual({
  belt,
  degree,
  unlocked,
  imageSrc,
  size = "md",
  className,
}: {
  belt: string;
  degree: number;
  unlocked: boolean;
  imageSrc: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  const box = SIZE_CLASS[size];

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={`${belt}${degree > 0 ? ` · ${degree}º grau` : ""}`}
        className={cn(
          "object-contain bg-transparent",
          box,
          !unlocked && "opacity-40 grayscale",
          className,
        )}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full ring-2 ring-border",
        box,
        !unlocked && "opacity-50",
        className,
      )}
      style={{ backgroundColor: swatch }}
      aria-hidden
    >
      <span
        className={cn(
          "font-bold tabular-nums",
          size === "hero" ? "text-2xl" : "text-[10px]",
          darkInk ? "text-neutral-900" : "text-white",
        )}
      >
        {degree > 0 ? `${degree}º` : "•"}
      </span>
    </div>
  );
}
