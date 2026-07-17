"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BELT_OPTIONS } from "@/lib/validations/members";
import { ROLE_OPTIONS, STATUS_OPTIONS, selectClassName } from "./labels";

export type MembersFilterValues = {
  q?: string;
  role?: string;
  status?: string;
  belt?: string;
};

function buildQuery(values: MembersFilterValues): string {
  const params = new URLSearchParams();
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.role) params.set("role", values.role);
  if (values.status) params.set("status", values.status);
  if (values.belt) params.set("belt", values.belt);
  const qs = params.toString();
  return qs ? `/members?${qs}` : "/members";
}

function normalize(values: MembersFilterValues) {
  return {
    q: values.q ?? "",
    role: values.role ?? "",
    status: values.status ?? "active",
    belt: values.belt ?? "",
  };
}

function countSheetFilters(values: ReturnType<typeof normalize>): number {
  let count = 0;
  if (values.role) count += 1;
  if (values.status !== "active") count += 1;
  if (values.belt) count += 1;
  return count;
}

export function MembersFilterBar({
  initial,
}: {
  initial: MembersFilterValues;
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
  }, [initial.q, initial.role, initial.status, initial.belt, open]);

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
    const next = normalize({ q, status: "active" });
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
            placeholder="Buscar"
            className="h-10 rounded-xl bg-card pl-9 pr-9"
            aria-label="Buscar membros"
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
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--member-filter-chip-active)] px-1.5 text-[10px] font-semibold text-foreground">
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
              Filtre por status, papel e faixa, depois toque em Aplicar.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 py-4">
            <div className="space-y-1.5">
              <label
                htmlFor="members-filter-status"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Status
              </label>
              <select
                id="members-filter-status"
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, status: e.target.value }))
                }
                className={selectClassName}
              >
                <option value="all">Todos</option>
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="members-filter-role"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Papel
              </label>
              <select
                id="members-filter-role"
                value={draft.role}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, role: e.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todos</option>
                {ROLE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="members-filter-belt"
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                Faixa
              </label>
              <select
                id="members-filter-belt"
                value={draft.belt}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, belt: e.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todas</option>
                {BELT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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
              {pending ? "Aplicando…" : "Aplicar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
