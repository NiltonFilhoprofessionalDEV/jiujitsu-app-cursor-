"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraduationCelebrationItem } from "@/actions/journey";
import { BeltDegreeVisual } from "@/components/journey/belt-degree-visual";
import { beltDegreeImageSrc } from "@/lib/belts/assets";
import { beltSwatch } from "@/lib/belts/colors";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "bjj-graduation-celebrated-ids";

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

export function GraduationCelebrationOverlay({
  item,
  onDismiss,
  persist = true,
}: {
  item: GraduationCelebrationItem;
  onDismiss: () => void;
  persist?: boolean;
}) {
  const dismiss = useCallback(() => {
    if (persist) markCelebrated(item.id);
    onDismiss();
  }, [item.id, onDismiss, persist]);

  const glow = beltSwatch(item.belt);

  return (
    <div
      key={item.id}
      className="trophy-celebrate-stage trophy-celebrate-stage-in fixed inset-0 z-[101] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="graduation-celebration-title"
      aria-describedby="graduation-celebration-message"
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
        onClick={dismiss}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <p
          className="trophy-celebrate-copy shrink-0 text-center text-lg font-semibold uppercase tracking-[0.18em] sm:text-xl"
          style={{ color: "var(--trophy-celebrate-eyebrow)" }}
        >
          {item.kind === "belt" ? "Nova faixa" : "Novo grau"}
        </p>

        <div className="flex min-h-0 w-full flex-[1.4] items-center justify-center py-1">
          <div className="trophy-celebrate-reveal max-h-full max-w-full">
            <div className="trophy-celebrate-float">
              <BeltDegreeVisual
                belt={item.belt}
                degree={item.degree}
                unlocked
                imageSrc={beltDegreeImageSrc(item.belt, item.degree)}
                size="hero"
                priority
              />
            </div>
          </div>
        </div>

        <div className="trophy-celebrate-copy shrink-0 max-w-sm space-y-2 text-center">
          <div className="space-y-1">
            <p
              id="graduation-celebration-title"
              className="font-display text-3xl tracking-[0.14em] sm:text-4xl"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              Parabéns!
            </p>
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {item.label}
            </p>
          </div>
          <p
            id="graduation-celebration-message"
            className="text-sm leading-relaxed"
            style={{ color: "var(--trophy-celebrate-muted)" }}
          >
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
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

function buildCelebrationItem(input: {
  id: string;
  belt: string;
  degree: number;
  previous: { belt: string; degree: number } | null;
}): GraduationCelebrationItem {
  const kind: "belt" | "degree" =
    !input.previous || input.previous.belt !== input.belt
      ? "belt"
      : "degree";
  const title = "Parabéns!";
  const label =
    kind === "belt"
      ? input.degree > 0
        ? `Faixa ${input.belt} · ${input.degree}º grau`
        : `Faixa ${input.belt}`
      : `${input.degree}º grau · ${input.belt}`;
  const message =
    kind === "degree"
      ? `Parabéns pelo novo grau na faixa ${input.belt}. Persistência no tatame tem nome — o seu.`
      : `Parabéns pela nova faixa ${input.belt}. O tatame reconhece quem não desiste.`;

  return {
    id: input.id,
    kind,
    belt: input.belt,
    degree: input.degree,
    title,
    label,
    message,
  };
}

async function celebrationFromInsert(row: {
  id: string;
  belt: string;
  degree: number;
  memberId: string;
}): Promise<GraduationCelebrationItem> {
  const supabase = createClient();
  const { data } = await supabase
    .from("graduation_history")
    .select("id, belt, degree, graduated_at")
    .eq("member_id", row.memberId)
    .order("graduated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(5);

  const rows = data ?? [];
  const currentIndex = rows.findIndex((r) => r.id === row.id);
  const previousRow =
    currentIndex >= 0
      ? rows[currentIndex + 1]
      : rows.find((r) => r.id !== row.id) ?? null;

  return buildCelebrationItem({
    id: row.id,
    belt: row.belt,
    degree: row.degree,
    previous: previousRow
      ? {
          belt: previousRow.belt as string,
          degree: Number(previousRow.degree ?? 0),
        }
      : null,
  });
}

export function GraduationCelebrationHost({
  memberId,
  initialItems,
}: {
  memberId: string;
  initialItems: GraduationCelebrationItem[];
}) {
  const [queue, setQueue] = useState<GraduationCelebrationItem[]>([]);
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
      .channel(`graduation-unlock-${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "graduation_history",
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            belt?: string;
            degree?: number;
          };
          if (!row.id || !row.belt) return;
          if (readCelebratedIds().has(row.id)) return;

          void celebrationFromInsert({
            id: row.id,
            belt: row.belt,
            degree: Number(row.degree ?? 0),
            memberId,
          }).then((item) => {
            setQueue((current) => {
              if (current.some((c) => c.id === item.id)) return current;
              return [...current, item];
            });
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
    <GraduationCelebrationOverlay
      item={current}
      onDismiss={dismiss}
      persist
    />
  );
}
