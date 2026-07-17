"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RecentApprovalCelebration } from "@/actions/attendance";

const STORAGE_KEY = "bjj-checkin-celebrated-ids";

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

export function CheckinApprovalCelebration({
  items,
}: {
  items: RecentApprovalCelebration[];
}) {
  const [queue, setQueue] = useState<RecentApprovalCelebration[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = readCelebratedIds();
    setQueue(items.filter((item) => !seen.has(item.id)));
    setReady(true);
  }, [items]);

  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    if (!current) return;
    markCelebrated(current.id);
    setQueue((q) => q.slice(1));
  }, [current]);

  if (!ready || !current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-approval-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar"
        onClick={dismiss}
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-[var(--surface-shadow)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">
          Presença confirmada
        </p>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 checkin-approval-pop">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <h2
            id="checkin-approval-title"
            className="font-display text-2xl tracking-[0.08em] text-foreground"
          >
            Mandou bem!
          </h2>
          <p className="text-sm text-muted-foreground">
            Sua presença em <span className="text-foreground">{current.class_name}</span>
            {current.date ? ` · ${current.date}` : ""} foi aprovada.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
