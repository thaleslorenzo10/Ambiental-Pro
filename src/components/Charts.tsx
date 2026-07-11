"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CampaignPerformance,
  DailyMetric,
  PlatformBreakdown,
} from "@/lib/meta/types";
import { compact, money, money2, num, platformLabel, shortDate } from "@/lib/format";

const AXIS = { stroke: "#475569", fontSize: 12 };
const GRID = "#1e293b";
const PIE_COLORS = ["#10b981", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6"];

function tooltipStyle() {
  return {
    contentStyle: {
      background: "#0b1120",
      border: "1px solid #1e293b",
      borderRadius: 12,
      color: "#e2e8f0",
    },
    labelStyle: { color: "#94a3b8" },
  };
}

export function LeadsPerDayChart({ data }: { data: DailyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis tickFormatter={compact} {...AXIS} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle()}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number) => [num(v), "Leads"]}
        />
        <Area
          type="monotone"
          dataKey="leads"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#leadsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SpendVsLeadsChart({ data }: { data: DailyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis
          yAxisId="left"
          tickFormatter={compact}
          {...AXIS}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => compact(v)}
          {...AXIS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltipStyle()}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number, name) =>
            name === "Investimento" ? [money(v), name] : [num(v), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Bar
          yAxisId="left"
          dataKey="spend"
          name="Investimento"
          fill="#38bdf8"
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="leads"
          name="Leads"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CplChart({ data }: { data: DailyMetric[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="cplFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `R$${v}`}
          {...AXIS}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...tooltipStyle()}
          labelFormatter={(l) => shortDate(String(l))}
          formatter={(v: number) => [money2(v), "CPL"]}
        />
        <Area
          type="monotone"
          dataKey="cpl"
          stroke="#a78bfa"
          strokeWidth={2.5}
          fill="url(#cplFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CampaignBars({ data }: { data: CampaignPerformance[] }) {
  const sorted = [...data].sort((a, b) => b.leads - a.leads);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tickFormatter={compact} {...AXIS} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fill: "#cbd5e1", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle()} formatter={(v: number) => [num(v), "Leads"]} />
        <Bar dataKey="leads" radius={[0, 6, 6, 0]} maxBarSize={26}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlatformPie({ data }: { data: PlatformBreakdown[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="leads"
          nameKey="platform"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle()}
          formatter={(v: number, n) => [num(v), platformLabel[String(n)] || n]}
        />
        <Legend
          formatter={(v) => (
            <span style={{ color: "#cbd5e1", fontSize: 12 }}>
              {platformLabel[String(v)] || v}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
