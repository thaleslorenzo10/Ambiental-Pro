import { num, pct } from "@/lib/format";

export function GoalProgress({ leads, goal }: { leads: number; goal: number }) {
  const percent = goal ? Math.min((leads / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - leads, 0);
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111a2e] p-5 shadow-lg shadow-black/20">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">Meta de leads</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {num(leads)}{" "}
            <span className="text-base font-medium text-slate-500">
              / {num(goal)}
            </span>
          </p>
        </div>
        <span className="text-2xl font-bold text-emerald-400">
          {pct(percent)}
        </span>
      </div>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {remaining > 0
          ? `Faltam ${num(remaining)} leads para bater a meta`
          : "🎉 Meta atingida!"}
      </p>
    </div>
  );
}
