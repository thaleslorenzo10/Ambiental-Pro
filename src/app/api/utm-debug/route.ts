import { fetchSheetLeads, isSheetsConfigured } from "@/lib/sheets/leads";
import { fetchMetaMetrics, isMetaConfigured } from "@/lib/meta/client";
import { isPaidLead } from "@/lib/classify";
import type { LeadRow } from "@/lib/meta/types";

export const dynamic = "force-dynamic";

function normName(s?: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function topValues(leads: LeadRow[], get: (l: LeadRow) => string, limit = 20) {
  const map = new Map<string, number>();
  for (const l of leads) {
    const v = (get(l) || "").trim() || "(vazio)";
    map.set(v, (map.get(v) || 0) + 1);
  }
  return Object.fromEntries(
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit),
  );
}

/**
 * Diagnóstico do cruzamento UTM ↔ Meta. Abra /api/utm-debug no deploy.
 * Mostra os valores distintos de cada coluna UTM e quantos leads casam com
 * as campanhas/conjuntos/anúncios do Meta — sem expor nome/email/telefone.
 */
export async function GET() {
  if (!isSheetsConfigured()) {
    return Response.json({ error: "Google Sheet não configurado (GOOGLE_SHEET_ID)." });
  }
  let leads: LeadRow[] = [];
  try {
    leads = await fetchSheetLeads();
  } catch (e) {
    return Response.json({ error: `Falha ao ler a planilha: ${String(e)}` });
  }

  let campaignNames: string[] = [];
  let adsetNames: string[] = [];
  let adNames: string[] = [];
  if (isMetaConfigured()) {
    try {
      const m = await fetchMetaMetrics();
      campaignNames = m.campaigns.map((c) => c.name);
      adsetNames = Array.from(new Set(m.adsets.map((e) => e.name)));
      adNames = Array.from(new Set(m.ads.map((e) => e.name)));
    } catch {
      /* ignore */
    }
  }

  // paid vs organic (regra: email = orgânico)
  const paid = leads.filter((l) => isPaidLead(l.source, l.medium)).length;

  // quantos leads casam exatamente com um nome de anúncio (por utm_content/term)
  const adSet = new Set(adNames.map(normName));
  const matchedAds = leads.filter(
    (l) => adSet.has(normName(l.content)) || adSet.has(normName(l.term)),
  ).length;

  return Response.json(
    {
      totalLeads: leads.length,
      classificacao_pago_organico: { pago: paid, organico: leads.length - paid },
      leadsQueCasamComAnuncio: matchedAds,
      valoresDistintos: {
        utm_source: topValues(leads, (l) => l.source),
        utm_medium: topValues(leads, (l) => l.medium),
        utm_campaign: topValues(leads, (l) => l.campaign),
        utm_term: topValues(leads, (l) => l.term),
        utm_content: topValues(leads, (l) => l.content),
      },
      metaCampanhas: campaignNames.slice(0, 20),
      metaConjuntos: adsetNames.slice(0, 20),
      metaAnuncios: adNames.slice(0, 30),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
