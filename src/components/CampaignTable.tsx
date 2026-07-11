import type { CampaignPerformance } from "@/lib/meta/types";
import { money, money2, num, pct } from "@/lib/format";

export function CampaignTable({ campaigns }: { campaigns: CampaignPerformance[] }) {
  const sorted = [...campaigns].sort((a, b) => b.leads - a.leads);
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-3 pr-4 font-medium">Campanha</th>
            <th className="pb-3 pr-4 text-right font-medium">Leads</th>
            <th className="pb-3 pr-4 text-right font-medium">Investido</th>
            <th className="pb-3 pr-4 text-right font-medium">CPL</th>
            <th className="pb-3 pr-4 text-right font-medium">CTR</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((c) => (
            <tr key={c.id} className="text-slate-300 hover:bg-white/[0.02]">
              <td className="py-3 pr-4 font-medium text-white">{c.name}</td>
              <td className="py-3 pr-4 text-right">{num(c.leads)}</td>
              <td className="py-3 pr-4 text-right">{money(c.spend)}</td>
              <td className="py-3 pr-4 text-right text-emerald-300">
                {money2(c.cpl)}
              </td>
              <td className="py-3 pr-4 text-right">{pct(c.ctr)}</td>
              <td className="py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "Ativa"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-500/15 text-slate-400"
                  }`}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
