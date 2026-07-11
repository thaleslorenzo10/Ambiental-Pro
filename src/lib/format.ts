const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const BRL2 = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("pt-BR");
const NUM1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const money = (n: number) => BRL.format(n || 0);
export const money2 = (n: number) => BRL2.format(n || 0);
export const num = (n: number) => NUM.format(n || 0);
export const pct = (n: number) => `${NUM1.format(n || 0)}%`;

export function compact(n: number): string {
  if (n >= 1_000_000) return `${NUM1.format(n / 1_000_000)}M`;
  if (n >= 1_000) return `${NUM1.format(n / 1_000)}k`;
  return NUM.format(n);
}

export function shortDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const platformLabel: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  audience_network: "Audience Network",
  messenger: "Messenger",
  unknown: "Outros",
};
