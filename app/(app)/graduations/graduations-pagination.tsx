import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function GraduationsPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  query,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  query: {
    q?: string;
    belt?: string;
    from?: string;
    to?: string;
  };
}) {
  if (totalPages <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    if (query.q?.trim()) params.set("q", query.q.trim());
    if (query.belt) params.set("belt", query.belt);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/graduations?${qs}` : "/graduations";
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs tabular-nums text-muted-foreground">
        {from}–{to} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium",
            page <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Link>
        <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
          {page}/{totalPages}
        </span>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={page >= totalPages}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium",
            page >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
