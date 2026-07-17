"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AnnouncementsFilterValues = {
  q?: string;
  unread?: string;
};

function buildQuery(values: AnnouncementsFilterValues): string {
  const params = new URLSearchParams();
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.unread === "1") params.set("unread", "1");
  const qs = params.toString();
  return qs ? `/announcements?${qs}` : "/announcements";
}

function normalize(values: AnnouncementsFilterValues) {
  return {
    q: values.q ?? "",
    unread: values.unread === "1" ? "1" : "",
  };
}

export function AnnouncementsFilterBar({
  initial,
}: {
  initial: AnnouncementsFilterValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(() => normalize(initial));
  const [draft, setDraft] = useState(() => normalize(initial));
  const [q, setQ] = useState(initial.q ?? "");
  const sheetFilterCount = applied.unread === "1" ? 1 : 0;

  useEffect(() => {
    const next = normalize(initial);
    setApplied(next);
    setQ(next.q);
    if (!open) setDraft(next);
  }, [initial.q, initial.unread, open]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = { ...applied, q };
      if (next.q === applied.q) return;
      setApplied(next);
      startTransition(() => {
        router.replace(buildQuery(next));
      });
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, router]);

  function applyFilters() {
    const next = normalize({ ...draft, q });
    setApplied(next);
    setOpen(false);
    startTransition(() => {
      router.replace(buildQuery(next));
    });
  }

  function clearFilters() {
    const next = normalize({ q });
    setDraft(next);
    setApplied(next);
    setOpen(false);
    startTransition(() => {
      router.replace(buildQuery(next));
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar avisos"
            className="h-10 rounded-xl bg-card pl-9 pr-9"
            aria-label="Buscar avisos"
            inputMode="search"
            autoComplete="off"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft({ ...applied, q });
            setOpen(true);
          }}
          className="relative h-10 shrink-0 gap-1.5 rounded-xl border-border bg-card px-3.5"
        >
          <ListFilter className="h-4 w-4" />
          Filtro
          {sheetFilterCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--inbox-unread-bg)] px-1.5 text-[10px] font-semibold text-foreground">
              {sheetFilterCount}
            </span>
          ) : null}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg gap-0 rounded-t-2xl border-border bg-popover pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--surface-shadow)]"
          overlayClassName="bg-black/55 supports-backdrop-filter:backdrop-blur-sm"
          showCloseButton
        >
          <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Mostre todos os avisos ou só os não lidos.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, unread: "" }))}
                className={
                  draft.unread !== "1"
                    ? "h-11 rounded-xl border border-[var(--inbox-unread-border)] bg-[var(--inbox-unread-bg)] text-sm font-medium"
                    : "h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground"
                }
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, unread: "1" }))}
                className={
                  draft.unread === "1"
                    ? "h-11 rounded-xl border border-[var(--inbox-unread-border)] bg-[var(--inbox-unread-bg)] text-sm font-medium"
                    : "h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground"
                }
              >
                Não lidos
              </button>
            </div>
          </div>

          <SheetFooter className="grid grid-cols-2 gap-2 border-t border-border px-4 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={pending}
              className="h-11 rounded-xl"
            >
              Limpar
            </Button>
            <Button
              type="button"
              onClick={applyFilters}
              disabled={pending}
              className="h-11 rounded-xl bg-[var(--page-fab-bg)] text-[var(--page-fab-fg)]"
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
