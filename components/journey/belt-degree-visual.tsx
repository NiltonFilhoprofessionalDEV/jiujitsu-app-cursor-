"use client";

import { useState } from "react";
import Image from "next/image";
import { beltSwatch, beltNeedsDarkInk } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

const SIZE_META = {
  md: {
    className: "h-14 w-14 sm:h-12 sm:w-12",
    px: 56,
    sizes: "56px",
  },
  lg: {
    className: "h-20 w-20 sm:h-16 sm:w-16",
    px: 80,
    sizes: "80px",
  },
  hero: {
    className:
      "h-[min(72vh,96vw)] w-[min(72vh,96vw)] max-h-[min(72vh,720px)] max-w-[min(96vw,720px)] drop-shadow-[0_28px_90px_rgba(0,0,0,0.8)]",
    px: 720,
    sizes: "(max-width: 720px) 96vw, 720px",
  },
} as const;

function BeltSwatchFallback({
  belt,
  degree,
  unlocked,
  size,
  className,
}: {
  belt: string;
  degree: number;
  unlocked: boolean;
  size: keyof typeof SIZE_META;
  className?: string;
}) {
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full ring-2 ring-border",
        SIZE_META[size].className,
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

export function BeltDegreeVisual({
  belt,
  degree,
  unlocked,
  imageSrc,
  size = "md",
  className,
  priority = false,
}: {
  belt: string;
  degree: number;
  unlocked: boolean;
  imageSrc: string;
  size?: keyof typeof SIZE_META;
  className?: string;
  priority?: boolean;
}) {
  const [src, setSrc] = useState(imageSrc);
  const [imgFailed, setImgFailed] = useState(false);
  const meta = SIZE_META[size];

  // Locked belts: swatch only — avoid downloading artwork the user can't open.
  if (!unlocked || imgFailed) {
    return (
      <BeltSwatchFallback
        belt={belt}
        degree={degree}
        unlocked={unlocked}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={`${belt}${degree > 0 ? ` · ${degree}º grau` : ""}`}
      width={meta.px}
      height={meta.px}
      sizes={meta.sizes}
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      className={cn(
        "object-contain bg-transparent",
        meta.className,
        className,
      )}
      onError={() => {
        if (src.endsWith(".webp")) {
          setSrc(src.replace(/\.webp$/i, ".png"));
          return;
        }
        setImgFailed(true);
      }}
    />
  );
}
