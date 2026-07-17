"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraduationCelebrationItem } from "@/actions/journey";
import { beltNeedsDarkInk, beltSwatch } from "@/lib/belts/colors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

function GraduationBeltHero({
  belt,
  degree,
}: {
  belt: string;
  degree: number;
}) {
  const swatch = beltSwatch(belt);
  const darkInk = beltNeedsDarkInk(belt);
  const isBlack = belt === "Preta";

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      <div
        className="relative h-16 w-full overflow-hidden rounded-full shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-white/15"
        style={{ background: swatch }}
        aria-hidden
      >
        {/* Degree bars */}
        {degree > 0 ? (
          <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {Array.from({ length: Math.min(degree, 6) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-10 w-1.5 rounded-sm",
                  isBlack || !darkInk ? "bg-white/90" : "bg-black/80",
                )}
              />
            ))}
          </div>
        ) : null}

        {/* Black belt tip: red + white */}
        {isBlack ? (
          <span className="absolute inset-y-0 right-0 flex w-[22%]">
            <span className="h-full w-[55%] bg-[var(--action-red)]" />
            <span className="h-full w-[45%] bg-white" />
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide",
          darkInk ? "text-neutral-900" : "text-white",
        )}
        style={{
          background: swatch,
          boxShadow: isBlack
            ? "inset 0 0 0 1px rgba(255,255,255,0.18)"
            : undefined,
        }}
      >
        {belt}
        {degree > 0 ? ` · ${degree}º` : ""}
      </p>
    </div>
  );
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
          Graduação conquistada
        </p>

        <div className="flex min-h-0 w-full flex-1 items-center justify-center py-2">
          <div className="trophy-celebrate-reveal w-full">
            <div className="trophy-celebrate-float flex justify-center">
              <GraduationBeltHero belt={item.belt} degree={item.degree} />
            </div>
          </div>
        </div>

        <div className="trophy-celebrate-copy shrink-0 max-w-sm space-y-3 text-center">
          <div className="space-y-1">
            <p
              id="graduation-celebration-title"
              className="font-display text-4xl tracking-[0.14em] sm:text-5xl"
              style={{ color: "var(--trophy-celebrate-ink)" }}
            >
              {item.title}
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
  const title = kind === "belt" ? "Nova faixa!" : "Novo grau!";
  const label =
    kind === "belt"
      ? input.degree > 0
        ? `Faixa ${input.belt} · ${input.degree}º grau`
        : `Faixa ${input.belt}`
      : `${input.degree}º grau · ${input.belt}`;
  const message =
    kind === "degree"
      ? `Mais um grau na faixa ${input.belt}. Persistência no tatame tem nome — o seu.`
      : `Nova faixa ${input.belt}. O tatame reconhece quem não desiste.`;

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
