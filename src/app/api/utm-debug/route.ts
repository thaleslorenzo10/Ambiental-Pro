import { fetchSheetLeads, isSheetsConfigured } from "@/lib/sheets/leads";
import { fetchMetaMetrics, isMetaConfigured } from "@/lib/meta/client";
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

  let metaNames: string[] = [];
  let campaignNames: string[] = [];
  if (isMetaConfigured()) {
    try {
      const m = await fetchMetaMetrics();
      campaignNames = m.campaigns.map((c) => c.name);
      metaNames = [...m.campaigns, ...m.adsets, ...m.ads].map((e) => e.name);
    } catch {
      /* ignore */
    }
  }
  const metaNorms = metaNames.map(normName).filter((n) => n.length >= 5);

  const isPaid = (l: LeadRow) => {
    const vals = [l.campaign, l.term, l.content, l.medium, l.source]
      .map(normName)
      .filter((v) => v.length >= 4);
    return vals.some((v) => metaNorms.some((en) => en.includes(v) || v.includes(en)));
  };

  const paid = leads.filter(isPaid).length;
  const unmatchedSample = leads
    .filter((l) => !isPaid(l))
    .slice(0, 8)
    .map((l) => ({
      source: l.source,
      medium: l.medium,
      campaign: l.campaign,
      term: l.term,
      content: l.content,
    }));

  return Response.json(
    {
      totalLeads: leads.length,
      classificacao: { pago: paid, organico: leads.length - paid },
      valoresDistintos: {
        utm_source: topValues(leads, (l) => l.source),
        utm_medium: topValues(leads, (l) => l.medium),
        utm_campaign: topValues(leads, (l) => l.campaign),
        utm_term: topValues(leads, (l) => l.term),
        utm_content: topValues(leads, (l) => l.content),
      },
      metaCampanhas: campaignNames.slice(0, 20),
      exemplosNaoCasados: unmatchedSample,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
