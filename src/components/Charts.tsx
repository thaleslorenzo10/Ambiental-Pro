"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Budget, CountryBreakdown, DailyMetric } from "@/lib/meta/types";
import { compact, money, money2, num, shortDate } from "@/lib/format";

const AXIS = { stroke: "#94a3b8", fontSize: 11 };
const GRID = "#eef1f5";

const tooltip = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e7e9ee",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
    fontSize: 12,
  },
  labelStyle: { color: "#64748b", fontWeight: 600 },
};

export function DailyEvolution({
  data,
  cplTarget,
}: {
  data: DailyMetric[];
  cplTarget?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis
          yAxisId="l"
          tickFormatter={compact}
          {...AXIS}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="r"
          orientation="right"
          tickFormatter={compact}
          {...AXIS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltip}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number, name) =>
            name === "Investido"
              ? [money(v), name]
              : name === "CPL"
                ? [money2(v), name]
                : [num(v), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="l"
          dataKey="spend"
          name="Investido"
          fill="#c7d2fe"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        <Line
          yAxisId="r"
          type="monotone"
          dataKey="leads"
          name="Leads"
          stroke="#059669"
          strokeWidth={2.5}
          dot={false}
        />
        <Line
          yAxisId="r"
          type="monotone"
          dataKey="cpl"
          name="CPL"
          stroke="#7c3aed"
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
        />
        {cplTarget ? (
          <ReferenceLine
            yAxisId="r"
            y={cplTarget}
            stroke="#dc2626"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `CPL alvo ${money2(cplTarget)}`,
              position: "insideTopRight",
              fill: "#dc2626",
              fontSize: 11,
            }}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CumulativeLeads({
  data,
  goal,
  daysTotal,
}: {
  data: DailyMetric[];
  goal: number;
  daysTotal: number;
}) {
  const idealPerDay = daysTotal ? goal / daysTotal : 0;
  const chart = data.map((d, i) => ({
    date: d.date,
    leads: d.cumulativeLeads,
    ideal: Math.round(idealPerDay * (i + 1)),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chart} margin={{ left: -8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="leadsCumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis tickFormatter={compact} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltip}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number, name) => [num(v), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="leads"
          name="Leads (real)"
          stroke="#7c3aed"
          strokeWidth={2.5}
          fill="url(#leadsCumFill)"
        />
        <Line
          type="monotone"
          dataKey="ideal"
          name="Meta (pace ideal)"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CumulativeInvestment({
  data,
  budget,
}: {
  data: DailyMetric[];
  budget: Budget;
}) {
  const idealPerDay = budget.daysTotal ? budget.total / budget.daysTotal : 0;
  const chart = data.map((d, i) => ({
    date: d.date,
    invested: d.cumulativeSpend,
    ideal: +(idealPerDay * (i + 1)).toFixed(2),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chart} margin={{ left: -8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis tickFormatter={compact} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltip}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number, name) => [money(v), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="invested"
          name="Investido (real)"
          stroke="#1e3a8a"
          strokeWidth={2.5}
          fill="url(#invFill)"
        />
        <Line
          type="monotone"
          dataKey="ideal"
          name="Pace ideal"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const COUNTRY_COLORS = ["#1e3a8a", "#f59e0b", "#38bdf8", "#a78bfa", "#94a3b8"];

export function CountryDonut({ data }: { data: CountryBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="spend"
          nameKey="country"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} stroke="#fff" />
          ))}
        </Pie>
        <Tooltip {...tooltip} formatter={(v: number, n) => [money(v), n]} />
        <Legend
          formatter={(v) => <span style={{ color: "#475569", fontSize: 12 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  Instagram: "#d6336c",
  Facebook: "#1877f2",
  WhatsApp: "#22c55e",
  "E-mail": "#f59e0b",
  Google: "#4285f4",
  Orgânico: "#64748b",
  Outros: "#94a3b8",
};

export function SourcesStackedArea({
  data,
  keys,
}: {
  data: Array<Record<string, number | string>>;
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis tickFormatter={compact} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltip}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number, n) => [num(v), n]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            name={k}
            stackId="1"
            stroke={SOURCE_COLORS[k] || `hsl(${i * 60}, 60%, 55%)`}
            fill={SOURCE_COLORS[k] || `hsl(${i * 60}, 60%, 55%)`}
            fillOpacity={0.75}
            strokeWidth={1}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
