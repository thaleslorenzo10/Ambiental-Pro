import type { Lead } from "@/lib/meta/types";
import { dateTime, platformLabel } from "@/lib/format";

const PLATFORM_BADGE: Record<string, string> = {
  instagram: "bg-pink-500/15 text-pink-300",
  facebook: "bg-blue-500/15 text-blue-300",
  audience_network: "bg-amber-500/15 text-amber-300",
  messenger: "bg-sky-500/15 text-sky-300",
  unknown: "bg-slate-500/15 text-slate-300",
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="scroll-thin max-h-[420px] overflow-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 bg-[#111a2e] text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="pb-3 pr-4 font-medium">Nome</th>
            <th className="pb-3 pr-4 font-medium">Contato</th>
            <th className="pb-3 pr-4 font-medium">Campanha</th>
            <th className="pb-3 pr-4 font-medium">Origem</th>
            <th className="pb-3 font-medium">Quando</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {leads.map((l) => (
            <tr key={l.id} className="text-slate-300 hover:bg-white/[0.02]">
              <td className="py-3 pr-4 font-medium text-white">{l.name}</td>
              <td className="py-3 pr-4">
                <div className="text-slate-300">{l.email}</div>
                <div className="text-xs text-slate-500">{l.phone}</div>
              </td>
              <td className="py-3 pr-4 text-slate-400">{l.campaign}</td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    PLATFORM_BADGE[l.platform] || PLATFORM_BADGE.unknown
                  }`}
                >
                  {platformLabel[l.platform] || l.platform}
                </span>
              </td>
              <td className="py-3 text-xs text-slate-400">
                {dateTime(l.createdTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
