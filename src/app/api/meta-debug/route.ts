import { fetchMetaMetrics, isMetaConfigured } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

const PRESET: Record<string, string> = {
  hoje: "today",
  ontem: "yesterday",
  "7d": "last_7d",
  "14d": "last_14d",
  max: "maximum",
};

/**
 * Diagnóstico da API do Meta. Abra /api/meta-debug?p=ontem (ou hoje, 7d, max).
 * Mostra o gasto e as campanhas que a API retorna para aquele período — ou o
 * erro exato (ex: token expirado). Não expõe o token.
 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") || "max";
  const preset = PRESET[p] || p;

  if (!isMetaConfigured()) {
    return Response.json({
      configurado: false,
      dica: "Faltam META_ACCESS_TOKEN e/ou META_AD_ACCOUNT_ID nas env vars.",
    });
  }

  try {
    const m = await fetchMetaMetrics(preset);
    return Response.json(
      {
        periodo: p,
        preset,
        ok: true,
        totalInvestido: m.totalSpend,
        campanhas: m.campaigns.length,
        leadsPixel: m.leadsPixel,
        impressoes: m.impressions,
        porCampanha: m.campaigns.map((c) => ({ nome: c.name, investido: c.spend })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        periodo: p,
        preset,
        ok: false,
        erro: String(e),
        dica:
          "Se o erro mencionar 'session', 'expired', 'code 190' ou 'OAuth' → o token expirou/está inválido. Se for 'code 100' → campo/breakdown. Outros → me manda o texto.",
      },
      { headers: { "cache-control": "no-store" } },
    );
  }
}
