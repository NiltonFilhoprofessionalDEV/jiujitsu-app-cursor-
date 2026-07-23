"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
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

function congratsFor(belt: string, degree: number, unlocked: boolean): string {
  if (!unlocked) {
    return "Continue no tatame. Essa conquista ainda está no seu caminho.";
  }
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
  const initialIndex = useMemo(() => {
    if (!card.unlocked) return 0;
    const highest = card.highestDegree ?? 0;
    return Math.max(0, Math.min(card.stages.length - 1, highest));
  }, [card]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [card.belt, initialIndex]);

  const stage: JourneyBeltStage =
    card.stages[index] ?? card.stages[0]!;
  const glow = beltSwatch(card.belt);
  const earnedLabel = formatEarnedAt(stage.earnedAt);
  const title = stage.unlocked ? "Parabéns!" : "Ainda falta";
  const subtitle = stage.unlocked
    ? stageLabel(stage.degree)
    : `${stageLabel(stage.degree)} · bloqueado`;

  function go(delta: number) {
    setIndex((current) => {
      const next = current + delta;
      if (next < 0 || next >= card.stages.length) return current;
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

      <div className="trophy-celebrate-glow pointer-events-none absolute left-1/2 top-[38%] h-[min(110vw,760px)] w-[min(110vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      <div className="trophy-celebrate-flare pointer-events-none absolute left-1/2 top-[38%] h-[min(85vw,520px)] w-[min(85vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar celebração"
        onClick={onDismiss}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p
          className="trophy-celebrate-copy shrink-0 text-center text-xl font-semibold uppercase tracking-[0.18em] sm:text-2xl"
          style={{ color: "var(--trophy-celebrate-eyebrow)" }}
        >
          {card.belt}
        </p>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2 py-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index <= 0}
            className="relative z-20 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition enabled:hover:bg-white/10 disabled:opacity-25"
            aria-label="Grau anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="trophy-celebrate-reveal relative">
            <div className="trophy-celebrate-float">
              <BeltDegreeVisual
                belt={card.belt}
                degree={stage.degree}
                unlocked={stage.unlocked}
                imageSrc={stage.imageSrc}
                size="hero"
              />
            </div>
            {!stage.unlocked ? (
              <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20">
                <Lock className="h-5 w-5" />
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= card.stages.length - 1}
            className="relative z-20 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition enabled:hover:bg-white/10 disabled:opacity-25"
            aria-label="Próximo grau"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div
          className="relative z-20 mb-3 flex items-center gap-1.5"
          role="tablist"
          aria-label="Graus da faixa"
        >
          {card.stages.map((s, i) => (
            <button
              key={s.degree}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-[var(--action-red)]" : "w-2 bg-white/30",
                s.unlocked ? "" : "opacity-50",
              )}
              aria-label={stageLabel(s.degree)}
            />
          ))}
        </div>

        <div className="trophy-celebrate-copy shrink-0 max-w-sm space-y-3 text-center">
          <div className="space-y-1">
            <p
              id="belt-celebration-title"
              className="font-display text-4xl tracking-[0.14em] sm:text-5xl"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {title}
            </p>
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {subtitle}
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
            {congratsFor(card.belt, stage.degree, stage.unlocked)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="trophy-celebrate-cta relative z-20 mt-7 inline-flex h-12 w-full max-w-xs shrink-0 items-center justify-center rounded-xl text-sm font-medium transition hover:brightness-110"
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
