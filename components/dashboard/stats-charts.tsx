"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 backdrop-blur-xl">
      <h2 className="mb-3 text-sm font-medium text-foreground">{title}</h2>
      <div className="h-48 w-full">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  background: "#121a2e",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
};

export function StatsCharts({
  studentsByBelt,
  attendanceByMonth,
  memberGrowth,
  graduationsByYear,
}: {
  studentsByBelt: { belt: string; count: number }[];
  attendanceByMonth: { month: string; count: number }[];
  memberGrowth: { month: string; count: number }[];
  graduationsByYear: { year: string; count: number }[];
}) {
  return (
    <div className="space-y-4">
      <ChartCard title="Alunos por faixa">
        {studentsByBelt.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentsByBelt}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="belt" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#e10600" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Presenças por mês">
        {attendanceByMonth.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceByMonth}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Crescimento de membros">
        {memberGrowth.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={memberGrowth}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Graduações por ano">
        {graduationsByYear.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={graduationsByYear}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Sem dados para exibir
    </div>
  );
}
