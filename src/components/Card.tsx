import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  dot = "#1e3a8a",
}: {
  children: ReactNode;
  hint?: string;
  dot?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: dot }}
        />
        {children}
      </h3>
      {hint && <p className="mt-0.5 pl-4 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: "slate" | "green" | "amber" | "red" | "blue" | "orange";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[color]}`}
    >
      {children}
    </span>
  );
}
