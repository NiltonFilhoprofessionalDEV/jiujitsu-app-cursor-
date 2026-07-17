import { beltNeedsDarkInk, beltSwatch } from "@/lib/belts/colors";
import { cn } from "@/lib/utils";

function formatJoined(value: string | null): string {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ProfileBeltCard({
  belt,
  degree,
  joinedAt,
}: {
  belt: string | null;
  degree: number | null;
  joinedAt: string | null;
}) {
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  const isBlack = belt === "Preta";

  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-[var(--surface-shadow)]",
        darkInk ? "text-neutral-900" : "text-white",
      )}
      style={{
        background: swatch,
        borderColor: darkInk
          ? "rgba(0,0,0,0.12)"
          : "rgba(255,255,255,0.18)",
        boxShadow: isBlack
          ? "inset 0 0 0 1px rgba(255,255,255,0.12), var(--surface-shadow)"
          : undefined,
      }}
    >
      <p
        className={cn(
          "text-[10px] font-medium uppercase tracking-[0.18em]",
          darkInk ? "text-neutral-800/70" : "text-white/75",
        )}
      >
        No tatame
      </p>
      <p className="font-display mt-1 text-3xl tracking-[0.04em]">
        {belt ?? "Sem faixa"}
        {typeof degree === "number" ? ` · grau ${degree}` : ""}
      </p>
      <p
        className={cn(
          "mt-3 text-sm",
          darkInk ? "text-neutral-800/75" : "text-white/80",
        )}
      >
        Membro desde {formatJoined(joinedAt)}
      </p>
    </section>
  );
}
