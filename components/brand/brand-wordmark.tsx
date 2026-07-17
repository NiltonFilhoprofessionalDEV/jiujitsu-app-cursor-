import { cn } from "@/lib/utils";

const NEON_GLOW =
  "0 0 1px rgba(225, 6, 0, 0.55), 0 0 4px rgba(225, 6, 0, 0.35), 0 0 10px rgba(225, 6, 0, 0.18)";

function NeonLetter({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("inline-block", className)}
      style={{ textShadow: NEON_GLOW, ...style }}
    >
      {children}
    </span>
  );
}

/** BJJ: preto · vermelho · branco — neon vermelho atrás de cada letra. */
export function BrandWordmark({
  className,
  showPulse = true,
}: {
  className?: string;
  showPulse?: boolean;
}) {
  return (
    <p
      className={cn(
        "auth-brand font-display tracking-[0.08em]",
        className,
      )}
      aria-label="BJJ Pulse"
    >
      <span className="inline-flex items-baseline gap-[0.02em]">
        <NeonLetter
          className="text-black"
          style={{
            WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.55)",
            paintOrder: "stroke fill",
          }}
        >
          B
        </NeonLetter>
        <NeonLetter className="text-[var(--action-red)]">J</NeonLetter>
        <NeonLetter className="text-white">J</NeonLetter>
      </span>
      {showPulse ? (
        <span className="inline-flex items-baseline tracking-[0.08em]">
          <span className="inline-block w-[0.28em]" aria-hidden />
          {"Pulse".split("").map((letter, index) => (
            <NeonLetter key={`${letter}-${index}`} className="text-[var(--bjj-text)]">
              {letter}
            </NeonLetter>
          ))}
        </span>
      ) : null}
    </p>
  );
}
