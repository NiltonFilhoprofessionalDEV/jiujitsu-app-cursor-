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
    <section className="space-y-3.5 sm:space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground sm:text-base sm:tracking-[0.12em]">
          Linha do tempo
        </h2>
        {events.length > 0 ? (
          <p className="text-xs tabular-nums text-muted-foreground sm:text-[10px]">
            {events.length} marco{events.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-center text-base text-muted-foreground shadow-[var(--surface-shadow)] backdrop-blur-xl sm:rounded-xl sm:p-4 sm:text-sm">
          Aqui entram faixas, graus e troféus conforme sua jornada avança.
        </div>
      ) : (
        <ol className="relative space-y-2.5 before:absolute before:top-3 before:bottom-3 before:left-[1.5rem] before:w-px before:bg-border sm:space-y-2 sm:before:left-[1.35rem]">
          {events.map((event) => {
            const Icon = TIMELINE_ICONS[event.type];
            return (
              <li
                key={event.id}
                className="relative flex items-start gap-3.5 rounded-2xl border border-border bg-card px-3.5 py-3.5 shadow-[var(--surface-shadow)] backdrop-blur-xl sm:gap-3 sm:rounded-xl sm:px-3 sm:py-3"
              >
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border sm:h-9 sm:w-9">
                  <Icon className="h-5 w-5 text-[var(--action-red)] sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1 sm:space-y-0.5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-[10px] sm:tracking-[0.14em]">
                    {TIMELINE_LABELS[event.type]}
                  </p>
                  <p className="text-base font-medium leading-snug text-foreground sm:text-sm">
                    {event.title}
                  </p>
                  {event.meta ? (
                    <p className="text-sm text-muted-foreground sm:text-xs">
                      {event.meta}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground sm:text-[10px]">
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
