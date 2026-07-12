import type { LaunchPhase } from "@/lib/meta/types";
import { money, money2, num, pct } from "@/lib/format";
import { Badge } from "./Card";

const STATUS_COLOR: Record<string, "green" | "amber" | "slate"> = {
  RODANDO: "green",
  AGUARDANDO: "amber",
  CONCLUÍDO: "slate",
};

const ACCENT: Record<string, string> = {
  RODANDO: "#10b981",
  AGUARDANDO: "#cbd5e1",
  CONCLUÍDO: "#94a3b8",
};

const CHANNEL_COLOR: Record<string, string> = {
  meta: "#1877f2",
  tiktok: "#ef4444",
  google: "#22c55e",
};

export function PhaseCard({ phase }: { phase: LaunchPhase }) {
  const burned = phase.budget ? (phase.spent / phase.budget) * 100 : 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7e9ee] bg-white shadow-sm">
      <div className="flex" style={{ borderLeft: `4px solid ${ACCENT[phase.status]}` }}>
        <div className="flex-1 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {/* left: name + status */}
            <div className="min-w-[160px]">
              <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
              <p className="text-xs text-slate-500">{phase.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge color={STATUS_COLOR[phase.status]}>{phase.status}</Badge>
                <span className="text-xs text-slate-400">{phase.window}</span>
              </div>
            </div>

            {/* middle: budget/pacing */}
            <div className="flex-1">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900 tnum">{money(phase.spent)}</p>
                  <p className="text-xs text-slate-400">de {money(phase.budget)}</p>
                </div>
                {phase.salesGoal ? (
                  <div className="text-right">
                    <p className="text-xs uppercase text-slate-400">Meta de vendas</p>
                    <p className="text-lg font-bold text-slate-800 tnum">{num(phase.salesGoal)}</p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs uppercase text-slate-400">Leads · CPL</p>
                    <p className="text-sm font-bold text-slate-800 tnum">
                      {num(phase.leads)} · {phase.cpl ? money2(phase.cpl) : "—"}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(burned, 100)}%`, background: ACCENT[phase.status] }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {pct(burned)} do budget · falta {money(Math.max(phase.budget - phase.spent, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* right: channels */}
        <div className="hidden w-52 border-l border-slate-100 p-4 lg:block">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-400">Por canal</p>
          <div className="space-y-2">
            {phase.channels.map((c) => (
              <div key={c.channel} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: CHANNEL_COLOR[c.channel] }}
                  />
                  <span className="text-slate-500">{c.label}</span>
                </span>
                <span className="font-semibold text-slate-700 tnum">{money(c.spent)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
