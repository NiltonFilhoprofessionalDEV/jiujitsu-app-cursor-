"use client";

import { useState } from "react";
import { beltSwatch, beltNeedsDarkInk } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

export function BeltDegreeVisual({
  belt,
  degree,
  unlocked,
  imageSrc,
  size = "md",
}: {
  belt: string;
  degree: number;
  unlocked: boolean;
  imageSrc: string;
  size?: "md" | "lg";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  const box =
    size === "lg"
      ? "h-20 w-20 sm:h-16 sm:w-16"
      : "h-14 w-14 sm:h-12 sm:w-12";

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={`${belt}${degree > 0 ? ` · ${degree}º grau` : ""}`}
        className={cn(
          "object-contain",
          box,
          !unlocked && "opacity-40 grayscale",
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
      )}
      style={{ backgroundColor: swatch }}
      aria-hidden
    >
      <span
        className={cn(
          "text-[10px] font-bold tabular-nums",
          darkInk ? "text-neutral-900" : "text-white",
        )}
      >
        {degree > 0 ? `${degree}º` : "•"}
      </span>
    </div>
  );
}
