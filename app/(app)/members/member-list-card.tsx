import Link from "next/link";
import type { AcademyMemberRow } from "@/actions/members";
import { BeltPill } from "@/components/belts/belt-pill";
import { ROLE_LABELS, STATUS_LABELS } from "./labels";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function MemberListCard({ member }: { member: AcademyMemberRow }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-[var(--surface-shadow)] transition hover:bg-[var(--member-row-hover)] active:scale-[0.99]"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--member-avatar-wash)] font-display text-xs tracking-wide text-foreground"
        aria-hidden
      >
        {initials(member.profile.name)}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {member.profile.name}
          </p>
          <span
            className={
              member.status === "active"
                ? "shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400"
                : member.status === "suspended"
                  ? "shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-400"
                  : "shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
            }
          >
            {STATUS_LABELS[member.status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            {ROLE_LABELS[member.role]}
          </span>
          {member.current_belt ? (
            <BeltPill
              belt={member.current_belt}
              degree={member.current_degree}
            />
          ) : null}
        </div>
      </div>
    </Link>
  );
}
