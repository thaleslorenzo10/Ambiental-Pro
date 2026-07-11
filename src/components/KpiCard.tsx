import { ReactNode } from "react";

interface KpiProps {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
  trend?: { value: number; positiveIsGood?: boolean };
  accent?: "brand" | "sky" | "violet" | "amber" | "rose";
}

const ACCENTS: Record<NonNullable<KpiProps["accent"]>, string> = {
  brand: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
  sky: "from-sky-500/20 to-sky-500/0 text-sky-300",
  violet: "from-violet-500/20 to-violet-500/0 text-violet-300",
  amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
  rose: "from-rose-500/20 to-rose-500/0 text-rose-300",
};

export function KpiCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent = "brand",
}: KpiProps) {
  const good = trend
    ? (trend.value >= 0) === (trend.positiveIsGood ?? true)
    : true;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#111a2e] p-5 shadow-lg shadow-black/20">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${ACCENTS[accent]} blur-xl`}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        {icon && <span className={ACCENTS[accent].split(" ").pop()}>{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={`font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
