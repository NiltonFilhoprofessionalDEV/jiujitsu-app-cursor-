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
import { BELT_OPTIONS } from "@/lib/validations/members";

export type GraduationsFilterValues = {
  q?: string;
  belt?: string;
  from?: string;
  to?: string;
};

function buildQuery(values: GraduationsFilterValues): string {
  const params = new URLSearchParams();
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.belt) params.set("belt", values.belt);
  if (values.from) params.set("from", values.from);
  if (values.to) params.set("to", values.to);
  const qs = params.toString();
  return qs ? `/graduations?${qs}` : "/graduations";
}

function normalize(values: GraduationsFilterValues) {
  return {
    q: values.q ?? "",
    belt: values.belt ?? "",
    from: values.from ?? "",
    to: values.to ?? "",
  };
}

function countSheetFilters(values: ReturnType<typeof normalize>): number {
  let count = 0;
  if (values.belt) count += 1;
  if (values.from) count += 1;
  if (values.to) count += 1;
  return count;
}

const selectClassName =
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function GraduationsFilterBar({
  initial,
}: {
  initial: GraduationsFilterValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(() => normalize(initial));
  const [draft, setDraft] = useState(() => normalize(initial));
  const [q, setQ] = useState(initial.q ?? "");
  const sheetFilterCount = countSheetFilters(applied);

  useEffect(() => {
    const next = normalize(initial);
    setApplied(next);
    setQ(next.q);
    if (!open) setDraft(next);
  }, [initial.q, initial.belt, initial.from, initial.to, open]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate only when search text changes
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
            placeholder="Buscar aluno"
            className="h-10 rounded-xl bg-card pl-9 pr-9"
            aria-label="Buscar aluno no histórico"
            inputMode="search"
            enterKeyHint="search"
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
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--grad-accent-wash)] px-1.5 text-[10px] font-semibold text-foreground">
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
              Filtre por faixa e período, depois toque em Aplicar.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4">
            <div className="space-y-1.5">
              <label
                htmlFor="grad-filter-belt"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Faixa
              </label>
              <select
                id="grad-filter-belt"
                value={draft.belt}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, belt: e.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todas</option>
                {BELT_OPTIONS.map((belt) => (
                  <option key={belt} value={belt}>
                    {belt}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="grad-filter-from"
                  className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  De
                </label>
                <Input
                  id="grad-filter-from"
                  type="date"
                  value={draft.from}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="grad-filter-to"
                  className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Até
                </label>
                <Input
                  id="grad-filter-to"
                  type="date"
                  value={draft.to}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="h-11"
                />
              </div>
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
              className="h-11 rounded-xl bg-[var(--page-fab-bg)] text-[var(--page-fab-fg)] hover:brightness-110"
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
