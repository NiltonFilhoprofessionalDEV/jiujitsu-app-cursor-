import Image from "next/image";
import type { TrophyMaterial } from "@/lib/journey/milestones";
import { TROPHY_IMAGE_SRC } from "@/lib/journey/trophy-assets";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { px: 56, className: "h-14 w-14", img: "h-12 w-12", sizes: "56px" },
  md: {
    px: 72,
    className: "h-[4.5rem] w-[4.5rem]",
    img: "h-16 w-16",
    sizes: "72px",
  },
  lg: { px: 160, className: "h-40 w-40", img: "h-36 w-36", sizes: "160px" },
  hero: {
    px: 720,
    className:
      "h-[min(72vh,96vw)] w-[min(72vh,96vw)] max-h-[min(72vh,720px)] max-w-[min(96vw,720px)]",
    img: "h-full w-full",
    sizes: "(max-width: 720px) 96vw, 720px",
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
      {unlocked ? (
        <Image
          src={TROPHY_IMAGE_SRC[material]}
          alt=""
          width={dims.px}
          height={dims.px}
          sizes={dims.sizes}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            dims.img,
            "object-contain transition",
            imgClassName,
          )}
        />
      ) : (
        <span
          className={cn(
            dims.img,
            "rounded-xl bg-muted/40 ring-1 ring-border",
          )}
          aria-hidden
        />
      )}
    </span>
  );
}
