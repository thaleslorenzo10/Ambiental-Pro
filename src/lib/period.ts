// Period filter — maps a UI key to a Meta Graph API date_preset and to a
// date range used to filter the Google-Sheet leads.

export interface PeriodOption {
  key: string;
  label: string;
  preset: string; // Meta date_preset
}

export const PERIODS: PeriodOption[] = [
  { key: "hoje", label: "Hoje", preset: "today" },
  { key: "ontem", label: "Ontem", preset: "yesterday" },
  { key: "7d", label: "7 dias", preset: "last_7d" },
  { key: "14d", label: "14 dias", preset: "last_14d" },
  { key: "max", label: "Desde o início", preset: "maximum" },
];

export const DEFAULT_PERIOD = "max";

export function periodFor(key?: string): PeriodOption {
  return PERIODS.find((p) => p.key === key) ?? PERIODS[PERIODS.length - 1];
}

/** Date range (inclusive `since`, exclusive `until`) for filtering sheet leads. */
export function periodRange(key?: string): { since?: Date; until?: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = (n: number) => {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - n);
    return d;
  };
  switch (key) {
    case "hoje":
      return { since: startOfToday };
    case "ontem":
      return { since: daysAgo(1), until: startOfToday };
    case "7d":
      return { since: daysAgo(6) };
    case "14d":
      return { since: daysAgo(13) };
    default:
      return {};
  }
}
