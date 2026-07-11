import type { DashboardData } from "@/lib/meta/types";
import { shortDate } from "@/lib/format";
import { Badge } from "./Card";

export function Header({ data }: { data: DashboardData }) {
  return (
    <header className="rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a8a] text-lg font-bold text-white">
            AP
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              {data.launch} — {data.client}
            </h1>
            <p className="text-sm text-slate-500">
              Dashboard de {data.phase} · Lorenzo Media
            </p>
            <div className="mt-1.5">
              <Badge color="blue">{data.phase}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Status
            </p>
            <p className="text-sm font-bold text-emerald-600">{data.status}</p>
          </div>
          <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
            {shortDate(data.periodStart)} — {shortDate(data.periodEnd)}
          </span>
          <Badge color={data.source === "meta" ? "green" : "amber"}>
            {data.source === "meta" ? "● Meta ao vivo" : "● Snapshot"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
