import { cn } from "@/lib/utils";

/** BJJ: preto · vermelho · branco — legível no dark com stroke no preto. */
export function BrandWordmark({
  className,
  showManager = true,
}: {
  className?: string;
  showManager?: boolean;
}) {
  return (
    <p
      className={cn(
        "auth-brand font-display tracking-[0.08em]",
        className,
      )}
      aria-label="BJJ Manager"
    >
      <span className="inline-flex items-baseline gap-[0.02em]">
        <span
          className="text-black"
          style={{
            WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.55)",
            paintOrder: "stroke fill",
          }}
        >
          B
        </span>
        <span className="text-[var(--action-red)]">J</span>
        <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          J
        </span>
      </span>
      {showManager ? (
        <span className="text-[var(--bjj-text)]"> Manager</span>
      ) : null}
    </p>
  );
}
