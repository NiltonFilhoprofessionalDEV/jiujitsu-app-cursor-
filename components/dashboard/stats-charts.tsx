"use client";

import { useId, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BeltRack } from "@/components/dashboard/belt-rack";
import { cn } from "@/lib/utils";

type MonthPoint = { month: string; count: number };
type YearPoint = { year: string; count: number };

function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
    .replace(" de ", "/");
}

function sumCounts(items: { count: number }[]): number {
  return items.reduce((acc, item) => acc + item.count, 0);
}

function ChartShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--surface-shadow)] backdrop-blur-xl">
      <header className="mb-4 space-y-0.5">
        <h2 className="font-display text-lg tracking-[0.1em] text-foreground">
          {title}
        </h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </header>
      <div className="h-52 w-full">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function StatsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="mt-0.5 tabular-nums text-[var(--action-red)]">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </div>
  );
}

function InsightStrip({
  attendanceTotal,
  growthTotal,
  graduationsTotal,
}: {
  attendanceTotal: number;
  growthTotal: number;
  graduationsTotal: number;
}) {
  const items = [
    { label: "Presenças · 12 meses", value: attendanceTotal },
    { label: "Entradas no quadro", value: growthTotal },
    { label: "Promoções registradas", value: graduationsTotal },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "rounded-xl border border-border bg-card px-2.5 py-3 text-center",
            "shadow-[var(--surface-shadow)]",
          )}
        >
          <p className="font-display text-2xl tabular-nums leading-none text-foreground">
            {item.value.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function StatsCharts({
  studentsByBelt,
  attendanceByMonth,
  memberGrowth,
  graduationsByYear,
}: {
  studentsByBelt: { belt: string; count: number }[];
  attendanceByMonth: MonthPoint[];
  memberGrowth: MonthPoint[];
  graduationsByYear: YearPoint[];
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const attendanceGradId = useId().replace(/:/g, "");

  const axis = isDark ? "#a3a3a3" : "#737373";
  const grid = isDark ? "rgba(255,255,255,0.06)" : "rgba(10,10,10,0.06)";
  const ink = isDark ? "#f5f5f5" : "#0a0a0a";
  const action = "#e10600";

  const attendanceData = useMemo(
    () =>
      attendanceByMonth.map((row) => ({
        ...row,
        label: formatMonthLabel(row.month),
      })),
    [attendanceByMonth],
  );

  const growthData = useMemo(
    () =>
      memberGrowth.map((row) => ({
        ...row,
        label: formatMonthLabel(row.month),
      })),
    [memberGrowth],
  );

  return (
    <div className="space-y-4">
      <BeltRack data={studentsByBelt} />

      <InsightStrip
        attendanceTotal={sumCounts(attendanceByMonth)}
        growthTotal={sumCounts(memberGrowth)}
        graduationsTotal={sumCounts(graduationsByYear)}
      />

      <ChartShell
        title="Presença no tatame"
        hint="Check-ins confirmados nos últimos 12 meses"
      >
        {attendanceData.length === 0 ? (
          <EmptyChart message="Abra aulas e registre presença para ver o ritmo mensal." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceData}>
              <defs>
                <linearGradient
                  id={attendanceGradId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={action} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={action} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                width={28}
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<StatsTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={action}
                strokeWidth={2.25}
                fill={`url(#${attendanceGradId})`}
                activeDot={{ r: 4, fill: action, stroke: ink, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartShell>

      <ChartShell
        title="Novos no quadro"
        hint="Membros que entraram na academia por mês"
      >
        {growthData.length === 0 ? (
          <EmptyChart message="Ainda não há entradas registradas no período." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthData} barCategoryGap="28%">
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                width={28}
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<StatsTooltip />} />
              <Bar dataKey="count" fill={ink} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>

      <ChartShell
        title="Promoções por ano"
        hint="Faixas e graus registrados no histórico"
      >
        {graduationsByYear.length === 0 ? (
          <EmptyChart message="Nenhuma promoção no mural ainda. Registre a primeira graduação." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graduationsByYear} barCategoryGap="32%">
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                width={28}
                tick={{ fill: axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<StatsTooltip />} />
              <Bar dataKey="count" fill={action} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>
    </div>
  );
}
