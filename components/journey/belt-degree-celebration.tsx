"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BeltDegreeVisual } from "@/components/journey/belt-degree-visual";
import { beltSwatch } from "@/lib/belts/colors";
import type {
  JourneyBeltCard,
  JourneyBeltStage,
} from "@/lib/journey/belt-collection";
import { cn } from "@/lib/utils";

function formatEarnedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(
    value.includes("T") ? value : `${value.slice(0, 10)}T12:00:00`,
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function stageLabel(degree: number): string {
  return degree === 0 ? "Faixa conquistada" : `${degree}º grau`;
}

function congratsFor(belt: string, degree: number): string {
  if (degree === 0) {
    return `Parabéns pela faixa ${belt}. O tatame reconhece quem não desiste.`;
  }
  return `Parabéns pelo ${degree}º grau na faixa ${belt}. Persistência tem o seu nome.`;
}

export function BeltDegreeCelebrationOverlay({
  card,
  onDismiss,
}: {
  card: JourneyBeltCard;
  onDismiss: () => void;
}) {
  const unlockedStages = useMemo(
    () => card.stages.filter((s) => s.unlocked),
    [card.stages],
  );

  const initialIndex = useMemo(() => {
    if (unlockedStages.length === 0) return 0;
    return unlockedStages.length - 1;
  }, [unlockedStages]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [card.belt, initialIndex]);

  if (unlockedStages.length === 0) return null;

  const stage: JourneyBeltStage =
    unlockedStages[index] ?? unlockedStages[0]!;
  const glow = beltSwatch(card.belt);
  const earnedLabel = formatEarnedAt(stage.earnedAt);

  function go(delta: number) {
    setIndex((current) => {
      const next = current + delta;
      if (next < 0 || next >= unlockedStages.length) return current;
      return next;
    });
  }

  return (
    <div
      key={`${card.belt}-${stage.degree}`}
      className="trophy-celebrate-stage trophy-celebrate-stage-in fixed inset-0 z-[100] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="belt-celebration-title"
      aria-describedby="belt-celebration-message"
      style={
        {
          "--trophy-material-glow": glow,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 85% 60% at 50% 40%, ${glow}88 0%, transparent 58%),
            radial-gradient(ellipse 100% 50% at 50% 100%, var(--trophy-celebrate-accent-wash) 0%, transparent 55%),
            linear-gradient(180deg, #050505 0%, var(--trophy-celebrate-bg) 55%, #000 100%)
          `,
        }}
      />

      <div className="trophy-celebrate-glow pointer-events-none absolute left-1/2 top-[42%] h-[min(120vw,900px)] w-[min(120vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      <div className="trophy-celebrate-flare pointer-events-none absolute left-1/2 top-[42%] h-[min(95vw,640px)] w-[min(95vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar celebração"
        onClick={onDismiss}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <p
          className="trophy-celebrate-copy shrink-0 text-center text-lg font-semibold uppercase tracking-[0.18em] sm:text-xl"
          style={{ color: "var(--trophy-celebrate-eyebrow)" }}
        >
          {card.belt}
        </p>

        <div className="relative flex min-h-0 w-full flex-[1.4] items-center justify-center py-1">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index <= 0}
            className="absolute left-0 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition enabled:hover:bg-black/50 disabled:opacity-20 sm:left-2"
            aria-label="Grau anterior"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <div className="trophy-celebrate-reveal relative max-h-full max-w-full">
            <div className="trophy-celebrate-float">
              <BeltDegreeVisual
                belt={card.belt}
                degree={stage.degree}
                unlocked
                imageSrc={stage.imageSrc}
                size="hero"
                priority
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= unlockedStages.length - 1}
            className="absolute right-0 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition enabled:hover:bg-black/50 disabled:opacity-20 sm:right-2"
            aria-label="Próximo grau"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>

        {unlockedStages.length > 1 ? (
          <div
            className="relative z-20 mb-2 flex items-center gap-1.5"
            role="tablist"
            aria-label="Graus conquistados"
          >
            {unlockedStages.map((s, i) => (
              <button
                key={s.degree}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-[var(--action-red)]" : "w-2 bg-white/30",
                )}
                aria-label={stageLabel(s.degree)}
              />
            ))}
          </div>
        ) : null}

        <div className="trophy-celebrate-copy shrink-0 max-w-sm space-y-2 text-center">
          <div className="space-y-1">
            <p
              id="belt-celebration-title"
              className="font-display text-3xl tracking-[0.14em] sm:text-4xl"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              Parabéns!
            </p>
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {stageLabel(stage.degree)}
              {earnedLabel ? (
                <span style={{ color: "var(--trophy-celebrate-muted)" }}>
                  {" "}
                  · {earnedLabel}
                </span>
              ) : null}
            </p>
          </div>
          <p
            id="belt-celebration-message"
            className="text-sm leading-relaxed"
            style={{ color: "var(--trophy-celebrate-muted)" }}
          >
            {congratsFor(card.belt, stage.degree)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="trophy-celebrate-cta relative z-20 mt-4 inline-flex h-12 w-full max-w-xs shrink-0 items-center justify-center rounded-xl text-sm font-medium transition hover:brightness-110"
          style={{
            background: "var(--trophy-celebrate-cta-bg)",
            color: "var(--trophy-celebrate-cta-fg)",
            boxShadow: "0 0 32px var(--trophy-celebrate-cta-glow)",
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
