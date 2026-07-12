// Classifies a lead as paid (came from ad spend) or organic (free), by its UTMs.
// Defaults key on utm_medium (cpc/paid = paid; captacao/organic = organic) and a
// few paid source names. Tune without redeploy via env:
//   LEAD_PAID_MEDIUMS  – comma list of utm_medium substrings that mean "paid"
//   LEAD_PAID_SOURCES  – comma list of utm_source substrings that mean "paid"
//   LEAD_ORGANIC_SOURCES – comma list forced to organic even if medium looks paid

function list(env: string | undefined, fallback: string[]): string[] {
  if (!env) return fallback;
  return env
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const PAID_MEDIUMS = () =>
  list(process.env.LEAD_PAID_MEDIUMS, [
    "cpc",
    "ppc",
    "paid",
    "paidsocial",
    "paid_social",
    "paid-social",
    "ads",
    "cpm",
    "social_paid",
    "trafego",
    "tráfego",
  ]);

const PAID_SOURCES = () =>
  list(process.env.LEAD_PAID_SOURCES, [
    "facebook_ads",
    "instagram_ads",
    "meta_ads",
    "fb_ads",
    "ig_ads",
  ]);

const ORGANIC_SOURCES = () =>
  list(process.env.LEAD_ORGANIC_SOURCES, [
    "whatsapp",
    "wpp",
    "email",
    "e-mail",
    "bio",
    "organico",
    "orgânico",
    "organic",
    "direct",
    "indicacao",
    "indicação",
    "grupo",
  ]);

export function isPaidLead(source = "", medium = ""): boolean {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  if (ORGANIC_SOURCES().some((x) => s.includes(x))) return false;
  if (PAID_MEDIUMS().some((x) => m.includes(x))) return true;
  if (PAID_SOURCES().some((x) => s.includes(x))) return true;
  return false;
}
