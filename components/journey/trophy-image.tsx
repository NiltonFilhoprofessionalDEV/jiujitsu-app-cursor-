import Image from "next/image";
import type { TrophyMaterial } from "@/lib/journey/milestones";
import { TROPHY_IMAGE_SRC } from "@/lib/journey/trophy-assets";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 56, className: "h-14 w-14", img: "h-12 w-12" },
  md: { px: 72, className: "h-[4.5rem] w-[4.5rem]", img: "h-16 w-16" },
  lg: { px: 160, className: "h-40 w-40", img: "h-36 w-36" },
  hero: {
    px: 1200,
    className:
      "h-[min(88vh,98vw)] w-[min(88vh,98vw)] max-h-[min(88vh,820px)] max-w-[min(98vw,820px)]",
    img: "h-full w-full",
  },
} as const;

export function TrophyImage({
  material,
  unlocked = true,
  size = "sm",
  className,
  imgClassName,
  plate = true,
  priority = false,
}: {
  material: TrophyMaterial;
  unlocked?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
  imgClassName?: string;
  /** Dark plate behind PNG (black backgrounds). Turn off for hero glow stage. */
  plate?: boolean;
  priority?: boolean;
}) {
  const dims = SIZES[size];

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden",
        plate && "rounded-2xl bg-neutral-950",
        !plate && "bg-transparent",
        dims.className,
        className,
      )}
    >
      <Image
        src={TROPHY_IMAGE_SRC[material]}
        alt=""
        width={dims.px}
        height={dims.px}
        priority={priority}
        className={cn(
          dims.img,
          "object-contain transition",
          !unlocked && "opacity-35 grayscale",
          imgClassName,
        )}
      />
    </span>
  );
}
