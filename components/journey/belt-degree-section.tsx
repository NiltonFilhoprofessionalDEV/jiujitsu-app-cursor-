"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { beltSwatch, beltNeedsDarkInk } from "@/lib/belts/colors";
import type { JourneyBeltCard } from "@/lib/journey/belt-collection";
import { cn } from "@/lib/utils";

function BeltDegreeVisual({
  belt,
  degree,
  unlocked,
  imageSrc,
}: {
  belt: string;
  degree: number;
  unlocked: boolean;
  imageSrc: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={`${belt}${degree > 0 ? ` · ${degree}º grau` : ""}`}
        className={cn(
          "h-14 w-14 object-contain sm:h-12 sm:w-12",
          !unlocked && "opacity-40 grayscale",
        )}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-14 w-14 items-center justify-center rounded-full ring-2 ring-border sm:h-12 sm:w-12",
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

export function BeltDegreeSection({
  cards,
  age,
  ageMissing,
}: {
  cards: JourneyBeltCard[];
  age: number | null;
  ageMissing: boolean;
}) {
  return (
    <section className="space-y-3.5 sm:space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg tracking-[0.1em] text-foreground sm:text-base sm:tracking-[0.12em]">
            Faixas e graus
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Conquistas na sua trilha
            {age != null ? ` · ${age} anos` : ""}
          </p>
        </div>
      </div>

      {ageMissing ? (
        <p className="rounded-xl border border-dashed border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
          Cadastre sua data de nascimento no perfil para vermos a sequência
          correta de faixas da sua idade.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-2">
        {cards.map((card) => (
          <div
            key={card.belt}
            className={cn(
              "relative flex min-h-[9rem] flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center shadow-[var(--surface-shadow)] backdrop-blur-xl sm:min-h-0 sm:gap-1.5 sm:p-3",
              !card.unlocked && "opacity-75",
              card.isCurrent && "ring-2 ring-[var(--action-red)]",
            )}
          >
            <div className="relative">
              <BeltDegreeVisual
                belt={card.belt}
                degree={card.highestDegree ?? 0}
                unlocked={card.unlocked}
                imageSrc={card.imageSrc}
              />
              {!card.unlocked ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border sm:h-5 sm:w-5">
                  <Lock className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                </span>
              ) : null}
            </div>
            <div className="min-w-0 space-y-1">
              <p
                className={cn(
                  "text-sm font-semibold leading-tight sm:text-xs",
                  card.unlocked ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {card.belt}
              </p>
              <div className="flex justify-center gap-1">
                {card.degrees.map((d) => (
                  <span
                    key={d.degree}
                    title={`${d.degree}º grau`}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      d.unlocked
                        ? "bg-[var(--action-red)]"
                        : "bg-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {card.unlocked
                  ? card.highestDegree && card.highestDegree > 0
                    ? `${card.highestDegree}º grau`
                    : "Conquistada"
                  : "Bloqueada"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
