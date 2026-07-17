"use client";

import { useMemo } from "react";
import { BELT_SWATCH, beltNeedsDarkInk } from "@/lib/belts/colors";
import { BELT_OPTIONS } from "@/lib/validations/members";
import { cn } from "@/lib/utils";

export type BeltPoint = { belt: string; count: number };

export { BELT_SWATCH };

const BELT_ORDER = new Map(
  BELT_OPTIONS.map((belt, index) => [belt, index] as const),
);

function sumCounts(items: { count: number }[]): number {
  return items.reduce((acc, item) => acc + item.count, 0);
}

export function BeltRack({ data }: { data: BeltPoint[] }) {
  const total = sumCounts(data);
  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        const ai = BELT_ORDER.get(a.belt as (typeof BELT_OPTIONS)[number]) ?? 99;
        const bi = BELT_ORDER.get(b.belt as (typeof BELT_OPTIONS)[number]) ?? 99;
        return ai - bi;
      }),
    [data],
  );

  if (total === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-6 text-center shadow-[var(--surface-shadow)]">
        <p className="font-display text-lg tracking-[0.08em] text-foreground">
          Mural de faixas vazio
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vincule alunos ativos para ver a composição do tatame.
        </p>
      </section>
    );
  }

  const dominant = sorted.reduce((best, item) =>
    item.count > best.count ? item : best,
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-[var(--action-red)]/15 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-sm tracking-[0.2em] text-muted-foreground">
              Mural de faixas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Composição dos alunos ativos
            </p>
          </div>
          <p className="font-display text-4xl tabular-nums leading-none text-foreground">
            {total}
          </p>
        </div>

        <div
          className="flex h-11 w-full overflow-hidden rounded-lg ring-1 ring-border"
          role="img"
          aria-label={`Distribuição de ${total} alunos por faixa`}
        >
          {sorted.map((item) => {
            const pct = (item.count / total) * 100;
            if (pct < 0.5) return null;
            const swatch = BELT_SWATCH[item.belt] ?? "#737373";
            const needsInk = beltNeedsDarkInk(item.belt);
            return (
              <div
                key={item.belt}
                title={`${item.belt}: ${item.count}`}
                className="relative h-full min-w-[4px] transition-[flex-grow] duration-500"
                style={{
                  flexGrow: item.count,
                  background: swatch,
                  boxShadow:
                    item.belt === "Preta"
                      ? "inset 0 0 0 1px rgba(255,255,255,0.12)"
                      : undefined,
                }}
              >
                {pct >= 12 ? (
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-1 text-center font-display text-[10px] tracking-wide",
                      needsInk ? "text-black/70" : "text-white/90",
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {sorted.map((item) => {
            const pct = Math.round((item.count / total) * 100);
            return (
              <li key={item.belt} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10 dark:ring-white/15"
                  style={{ background: BELT_SWATCH[item.belt] ?? "#737373" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {item.belt}
                </span>
                <span className="tabular-nums text-foreground">
                  {item.count}
                  <span className="text-muted-foreground"> · {pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Maior grupo:{" "}
          <span className="font-medium text-foreground">{dominant.belt}</span>
          {" · "}
          {dominant.count} {dominant.count === 1 ? "aluno" : "alunos"}
        </p>
      </div>
    </section>
  );
}
