import Link from "next/link";

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
    { label: "Instrutores", value: metrics.instructors },
    { label: "Turmas", value: metrics.classes },
    { label: "Presenças hoje", value: metrics.attendanceToday },
    { label: "Presenças no mês", value: metrics.attendanceMonth },
    { label: "Novos no mês", value: metrics.newMembersMonth },
    { label: "Graduações no mês", value: metrics.graduationsMonth },
    { label: "Alunos inativos", value: metrics.inactiveStudents },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_0_40px_rgba(225,6,0,0.12)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--action-red)]/25 blur-3xl" />
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

export function QuickActions() {
  const actions = [
    {
      href: "/classes",
      label: "Abrir aula",
      hint: "Turmas e sessões",
      tone: "bg-[var(--action-red)] text-white",
    },
    {
      href: "/members",
      label: "Membros",
      hint: "Alunos e equipe",
      tone: "bg-foreground text-background",
    },
    {
      href: "/announcements",
      label: "Avisos",
      hint: "Comunicados",
      tone: "border border-border bg-card text-foreground",
    },
  ] as const;

  return (
    <section className="grid grid-cols-3 gap-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`rounded-xl px-3 py-3 text-center ${action.tone}`}
        >
          <p className="font-display text-sm tracking-wide">{action.label}</p>
          <p className="mt-1 text-[10px] opacity-70">{action.hint}</p>
        </Link>
      ))}
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
        <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground backdrop-blur-xl">
          {empty}
        </div>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-border bg-card px-4 py-3 backdrop-blur-xl"
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
