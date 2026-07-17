import {
  Award,
  Flag,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "@/lib/journey/timeline";

const TIMELINE_ICONS: Record<TimelineEventType, LucideIcon> = {
  joined: Flag,
  belt: Award,
  degree: Sparkles,
  achievement: Trophy,
};

const TIMELINE_LABELS: Record<TimelineEventType, string> = {
  joined: "Chegada",
  belt: "Faixa",
  degree: "Grau",
  achievement: "Troféu",
};

function formatDate(iso: string): string {
  const value = iso.includes("T") ? iso : `${iso}T12:00:00`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function JourneyTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-base tracking-[0.12em] text-foreground">
          Linha do tempo
        </h2>
        {events.length > 0 ? (
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {events.length} marco{events.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground shadow-[var(--surface-shadow)] backdrop-blur-xl">
          Aqui entram faixas, graus e troféus conforme sua jornada avança.
        </div>
      ) : (
        <ol className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-[1.35rem] before:w-px before:bg-border">
          {events.map((event) => {
            const Icon = TIMELINE_ICONS[event.type];
            return (
              <li
                key={event.id}
                className="relative flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-[var(--surface-shadow)] backdrop-blur-xl"
              >
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border">
                  <Icon className="h-4 w-4 text-[var(--action-red)]" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {TIMELINE_LABELS[event.type]}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {event.title}
                  </p>
                  {event.meta ? (
                    <p className="text-xs text-muted-foreground">{event.meta}</p>
                  ) : null}
                </div>
                <span className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {formatDate(event.at)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
