"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrophyCelebrationItem } from "@/actions/journey";
import { TrophyImage } from "@/components/journey/trophy-image";
import {
  findMilestoneByCode,
  milestonesForTrack,
  trophyTitle,
  type JourneyTrack,
  type TrophyMaterial,
} from "@/lib/journey/milestones";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "bjj-trophy-celebrated-ids";

/** Material glow — semantic accents for celebration stage */
const MATERIAL_GLOW: Record<TrophyMaterial, string> = {
  wood: "rgba(196, 110, 28, 0.7)",
  stone: "rgba(168, 172, 180, 0.65)",
  iron: "rgba(130, 148, 168, 0.7)",
  silver: "rgba(230, 238, 255, 0.85)",
  gold: "rgba(255, 196, 48, 0.8)",
  diamond: "rgba(72, 220, 255, 0.8)",
};

/** Congrats lines — Fight Poster / dojo voice */
const CONGRATS_STUDENT: Record<TrophyMaterial, string> = {
  wood: "O tatame já sente sua presença. Continuidade vence talento.",
  stone: "Base sólida. Quem treina consistente sobe de nível.",
  iron: "Disciplina forjada. Poucos chegam aqui sem suor de verdade.",
  silver: "Marca rara. Sua jornada já inspira quem treina ao lado.",
  gold: "Elite do tatame. Você transformou frequência em legado.",
  diamond: "Lenda viva. Pouquíssimos chegam — e você chegou.",
};

const CONGRATS_TEACHING: Record<TrophyMaterial, string> = {
  wood: "Primeiras aulas dadas. Quem ensina também evolui.",
  stone: "Sua presença no quadro já faz diferença na academia.",
  iron: "Professor consistente. A turma cresce com o seu exemplo.",
  silver: "Referência no tatame. Sua liderança está consolidada.",
  gold: "Mestre do cotidiano. Cem aulas moldam gerações.",
  diamond: "Lenda da academia. Seu ensino deixou marca permanente.",
};

function congratsMessage(item: TrophyCelebrationItem): string {
  const map = item.code.startsWith("taught_")
    ? CONGRATS_TEACHING
    : CONGRATS_STUDENT;
  return map[item.material];
}

function readCelebratedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function markCelebrated(id: string) {
  const next = readCelebratedIds();
  next.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

function itemFromCode(
  id: string,
  code: string,
): TrophyCelebrationItem | null {
  const milestone = findMilestoneByCode(code);
  if (!milestone) return null;
  return {
    id,
    code: milestone.code,
    material: milestone.material,
    materialLabel: milestone.materialLabel,
    label: milestone.label,
    title: trophyTitle(milestone),
  };
}

export type PreviewableTrophy = TrophyCelebrationItem;

export function TrophyCelebrationOverlay({
  item,
  onDismiss,
  persist = true,
}: {
  item: TrophyCelebrationItem;
  onDismiss: () => void;
  persist?: boolean;
}) {
  const dismiss = useCallback(() => {
    if (persist) markCelebrated(item.id);
    onDismiss();
  }, [item.id, onDismiss, persist]);

  const glow = MATERIAL_GLOW[item.material];
  const message = congratsMessage(item);

  return (
    <div
      key={item.id}
      className="trophy-celebrate-stage trophy-celebrate-stage-in fixed inset-0 z-[100] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trophy-celebration-title"
      aria-describedby="trophy-celebration-message"
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
            radial-gradient(ellipse 85% 60% at 50% 40%, ${glow} 0%, transparent 58%),
            radial-gradient(ellipse 100% 50% at 50% 100%, var(--trophy-celebrate-accent-wash) 0%, transparent 55%),
            linear-gradient(180deg, #050505 0%, var(--trophy-celebrate-bg) 55%, #000 100%)
          `,
        }}
      />

      <div className="trophy-celebrate-glow pointer-events-none absolute left-1/2 top-[40%] h-[min(110vw,760px)] w-[min(110vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
      <div className="trophy-celebrate-flare pointer-events-none absolute left-1/2 top-[40%] h-[min(85vw,520px)] w-[min(85vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full" />

      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar celebração"
        onClick={dismiss}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p
          className="trophy-celebrate-copy shrink-0 text-center text-xl font-semibold uppercase tracking-[0.18em] sm:text-2xl"
          style={{ color: "var(--trophy-celebrate-eyebrow)" }}
        >
          Conquista desbloqueada
        </p>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-2">
          <div className="trophy-celebrate-reveal">
            <div className="trophy-celebrate-float">
              <TrophyImage
                material={item.material}
                unlocked
                size="hero"
                plate={false}
                priority
                className="drop-shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
                imgClassName="[mix-blend-mode:screen]"
              />
            </div>
          </div>
        </div>

        <div className="trophy-celebrate-copy shrink-0 max-w-sm space-y-3 text-center">
          <div className="space-y-1">
            <p
              id="trophy-celebration-title"
              className="font-display text-4xl tracking-[0.14em] sm:text-5xl"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              Parabéns!
            </p>
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {item.title}
              <span style={{ color: "var(--trophy-celebrate-muted)" }}>
                {" "}
                · {item.label}
              </span>
            </p>
          </div>
          <p
            id="trophy-celebration-message"
            className="text-sm leading-relaxed"
            style={{ color: "var(--trophy-celebrate-muted)" }}
          >
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="trophy-celebrate-cta mt-7 inline-flex h-12 w-full max-w-xs shrink-0 items-center justify-center rounded-xl text-sm font-medium transition hover:brightness-110"
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

export function TrophyCelebrationHost({
  memberId,
  initialItems,
}: {
  memberId: string;
  initialItems: TrophyCelebrationItem[];
}) {
  const [queue, setQueue] = useState<TrophyCelebrationItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = readCelebratedIds();
    setQueue(initialItems.filter((item) => !seen.has(item.id)));
    setReady(true);
  }, [initialItems]);

  useEffect(() => {
    if (!memberId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`trophy-unlock-${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "member_achievements",
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            code?: string;
          };
          if (!row.id || !row.code) return;
          if (readCelebratedIds().has(row.id)) return;

          const item = itemFromCode(row.id, row.code);
          if (!item) return;

          setQueue((current) => {
            if (current.some((c) => c.id === item.id)) return current;
            return [...current, item];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);

  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  if (!ready || !current) return null;

  return (
    <TrophyCelebrationOverlay item={current} onDismiss={dismiss} persist />
  );
}

/** @deprecated Use TrophySection — kept for compatibility. */
export function TrophyCelebrationPreview({
  track = "student",
}: {
  track?: JourneyTrack;
}) {
  const [queue, setQueue] = useState<TrophyCelebrationItem[]>([]);

  const startPreview = useCallback(() => {
    const milestones = milestonesForTrack(track);
    const items: TrophyCelebrationItem[] = milestones.map((m, index) => ({
      id: `preview-${m.code}-${Date.now()}-${index}`,
      code: m.code,
      material: m.material,
      materialLabel: m.materialLabel,
      label: m.label,
      title: trophyTitle(m),
    }));
    setQueue(items);
  }, [track]);

  const current = queue[0] ?? null;

  return (
    <>
      <button
        type="button"
        onClick={startPreview}
        className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
      >
        Pré-visualizar celebração dos troféus
      </button>
      {current ? (
        <TrophyCelebrationOverlay
          item={current}
          persist={false}
          onDismiss={() => setQueue((q) => q.slice(1))}
        />
      ) : null}
    </>
  );
}
