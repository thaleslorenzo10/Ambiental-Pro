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
      className={`card-hover rounded-2xl border border-[#e8eaf0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.12)] ${className}`}
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
      <h3 className="flex items-center gap-2.5 text-[15px] font-bold tracking-tight text-slate-800">
        <span
          className="inline-block h-4 w-1 rounded-full"
          style={{ background: dot }}
        />
        {children}
      </h3>
      {hint && <p className="mt-1 pl-[14px] text-xs text-slate-400">{hint}</p>}
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
