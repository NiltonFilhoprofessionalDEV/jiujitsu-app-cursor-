"use client";

import Link from "next/link";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  ClipboardCheck,
  Megaphone,
  Users,
} from "lucide-react";
import type {
  NextClassBoard,
  OpenSessionBoardItem,
} from "@/actions/dashboard";
import { formatTimeHm } from "@/lib/classes/next-training";
import { cn } from "@/lib/utils";

function formatStartedAt(iso: string | null): string {
  if (!iso) return "Aberta";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Aberta";
  return `Desde ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function nextClassWhen(next: NonNullable<NextClassBoard>): string {
  const time = formatTimeHm(next.startTime);
  if (next.isOngoing) return `Em andamento · até ${formatTimeHm(next.endTime)}`;
  if (next.dayOffset === 0) return `Hoje · ${time}`;
  if (next.dayOffset === 1) return `Amanhã · ${time}`;
  return `${time}`;
}

export function MetricGlassCard({
  metrics,
}: {
  metrics: {
    activeStudents: number;
    instructors: number;
    classes: number;
    attendanceToday: number;
    attendanceMonth: number;
    newMembersMonth: number;
    graduationsMonth: number;
    inactiveStudents: number;
  };
}) {
  const tiles = [
    { label: "Alunos ativos", value: metrics.activeStudents },
    { label: "Presenças hoje", value: metrics.attendanceToday },
    { label: "Presenças no mês", value: metrics.attendanceMonth },
    { label: "Alunos inativos", value: metrics.inactiveStudents },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--surface-shadow)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl"
        style={{ background: "var(--home-metric-wash)" }}
      />
      <p className="font-display text-sm tracking-[0.2em] text-muted-foreground">
        Visão geral
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-border bg-background/60 px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="font-display mt-1 text-3xl tabular-nums leading-none text-foreground">
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function NowOnMatBoard({
  sessions,
}: {
  sessions: OpenSessionBoardItem[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          Agora no tatame
        </h2>
        {sessions.length > 0 ? (
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--action-red)]">
            {sessions.length} aberta{sessions.length > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center shadow-[var(--surface-shadow)]">
          <p className="text-base text-muted-foreground">
            Nenhuma aula aberta agora.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-[var(--surface-shadow)] transition hover:bg-muted active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--action-red)]/12 text-[var(--action-red)]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {session.className}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatStartedAt(session.startedAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">
                  <p className="font-medium text-foreground">
                    {session.presentCount} presente
                    {session.presentCount === 1 ? "" : "s"}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5",
                      session.pendingCount > 0
                        ? "font-medium text-[var(--action-red)]"
                        : "text-muted-foreground",
                    )}
                  >
                    {session.pendingCount} pendente
                    {session.pendingCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CheckinQueueCard({
  pendingCount,
  firstSessionId,
}: {
  pendingCount: number;
  firstSessionId: string | null;
}) {
  const href =
    pendingCount > 0 && firstSessionId
      ? `/sessions/${firstSessionId}`
      : "/checkin";

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-4 shadow-[var(--surface-shadow)] transition active:scale-[0.99]",
        pendingCount > 0
          ? "border-[color:var(--home-ops-live-border)] bg-[var(--home-ops-live)] hover:brightness-[1.03]"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          pendingCount > 0
            ? "bg-[var(--action-red)] text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <ClipboardCheck className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground">
          Fila de check-in
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {pendingCount > 0
            ? `${pendingCount} pedido${pendingCount > 1 ? "s" : ""} aguardando`
            : "Nenhum pedido pendente"}
        </p>
      </div>
      {pendingCount > 0 ? (
        <span className="shrink-0 rounded-full bg-[var(--action-red)] px-3 py-1.5 text-sm font-bold tabular-nums text-primary-foreground">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      ) : null}
    </Link>
  );
}

export function NextClassCard({ next }: { next: NextClassBoard }) {
  if (!next) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-5 shadow-[var(--surface-shadow)]">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Próxima aula
        </p>
        <p className="mt-2 text-base text-muted-foreground">
          Sem turmas agendadas nos próximos dias.
        </p>
      </section>
    );
  }

  const href = next.openSessionId
    ? `/sessions/${next.openSessionId}`
    : `/classes/${next.classId}`;
  const cta = next.openSessionId ? "Ir para aula" : "Abrir aula";

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)]">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Próxima aula
      </p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-foreground">
            {next.className}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {nextClassWhen(next)}
          </p>
          {next.instructorName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Prof. {next.instructorName}
            </p>
          ) : null}
        </div>
        <Link
          href={href}
          className="inline-flex h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-base font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}

export function QuickActions({
  canGraduate,
  canAnnounce,
  canAddVideo,
}: {
  canGraduate: boolean;
  canAnnounce: boolean;
  canAddVideo?: boolean;
}) {
  const actions = [
    {
      href: "/checkin",
      label: "Fila",
      hint: "Aprovar presença",
      icon: ClipboardCheck,
      tone: "bg-[var(--action-red)] text-primary-foreground",
    },
    {
      href: "/classes",
      label: "Abrir aula",
      hint: "Turmas e sessões",
      icon: CalendarDays,
      tone: "bg-foreground text-background",
    },
    {
      href: "/members",
      label: "Membros",
      hint: "Alunos e equipe",
      icon: Users,
      tone: "border border-border bg-card text-foreground",
    },
    ...(canGraduate
      ? [
          {
            href: "/graduations",
            label: "Graduar",
            hint: "Faixas e graus",
            icon: Award,
            tone: "border border-border bg-card text-foreground",
          },
        ]
      : []),
    ...(canAnnounce
      ? [
          {
            href: "/announcements",
            label: "Novo aviso",
            hint: "Comunicados",
            icon: Megaphone,
            tone: "border border-border bg-card text-foreground",
          },
        ]
      : [
          {
            href: "/announcements",
            label: "Avisos",
            hint: "Comunicados",
            icon: Megaphone,
            tone: "border border-border bg-card text-foreground",
          },
        ]),
    ...(canAddVideo
      ? [
          {
            href: "/classroom/new",
            label: "Novo vídeo",
            hint: "Aula virtual",
            icon: Clapperboard,
            tone: "border border-border bg-card text-foreground",
          },
        ]
      : []),
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={`${action.href}-${action.label}`}
            href={action.href}
            className={cn(
              "flex min-h-[5.25rem] flex-col justify-between rounded-xl px-3.5 py-3.5 transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
              action.tone,
            )}
          >
            <Icon className="h-5 w-5 opacity-90" />
            <div>
              <p className="font-display text-base leading-tight tracking-wide">{action.label}</p>
              <p className="mt-1 text-xs leading-tight opacity-80">{action.hint}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

export function RecentList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base tracking-[0.12em] text-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
          {empty}
        </div>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--surface-shadow)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.primary}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.secondary}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.meta}
              </span>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
