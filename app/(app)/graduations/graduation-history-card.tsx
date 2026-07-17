import Link from "next/link";
import { BeltPill } from "@/components/belts/belt-pill";

export type GraduationHistoryItem = {
  id: string;
  member_id: string;
  member_name: string;
  belt: string;
  degree: number;
  graduated_at: string;
  notes: string | null;
  awarded_by_name: string | null;
  previous_belt: string | null;
  previous_degree: number | null;
};

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function GraduationHistoryCard({
  graduation,
}: {
  graduation: GraduationHistoryItem;
}) {
  const hasPrevious =
    Boolean(graduation.previous_belt) ||
    graduation.previous_degree !== null;

  return (
    <Link
      href={`/members/${graduation.member_id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] transition hover:bg-[var(--grad-card-hover)] active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="truncate font-semibold text-foreground">
            {graduation.member_name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {hasPrevious && graduation.previous_belt ? (
              <>
                <BeltPill
                  belt={graduation.previous_belt}
                  degree={graduation.previous_degree ?? 0}
                  className="opacity-70"
                />
                <span className="text-xs text-[var(--grad-from-muted)]">→</span>
              </>
            ) : null}
            <BeltPill belt={graduation.belt} degree={graduation.degree} />
          </div>
        </div>
        <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatDate(graduation.graduated_at)}
        </time>
      </div>

      {graduation.notes ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {graduation.notes}
        </p>
      ) : null}

      {graduation.awarded_by_name ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Por {graduation.awarded_by_name}
        </p>
      ) : null}
    </Link>
  );
}
