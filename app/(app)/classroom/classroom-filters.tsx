"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export function ClassroomFilters({
  classes,
  activeClassId,
}: {
  classes: { id: string; name: string }[];
  activeClassId?: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Link
        href="/classroom"
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs",
          !activeClassId
            ? "border-[var(--action-red)] bg-[var(--action-red)]/10 text-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        Todas
      </Link>
      {classes.map((c) => (
        <Link
          key={c.id}
          href={`/classroom?classId=${c.id}`}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs",
            activeClassId === c.id
              ? "border-[var(--action-red)] bg-[var(--action-red)]/10 text-foreground"
              : "border-border text-muted-foreground",
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
