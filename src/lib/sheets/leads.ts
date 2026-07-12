import type { LeadRow, Platform } from "@/lib/meta/types";

// --- Google Sheets lead source ----------------------------------------------
// Reads the launch capture-page leads (real leads) from a Google Sheet exported
// as CSV. These are the "leads reais" that drive the dashboard's lead numbers.
//
// Env (see .env.example):
//   GOOGLE_SHEET_CSV_URL   – full "publish to web" CSV url, OR
//   GOOGLE_SHEET_ID (+ GOOGLE_SHEET_GID) – builds the gviz CSV url automatically
//
// Optional column overrides (case-insensitive header match). Auto-detected if omitted.
//   SHEET_COL_NAME, SHEET_COL_EMAIL, SHEET_COL_PHONE, SHEET_COL_DATE,
//   SHEET_COL_SOURCE, SHEET_COL_MEDIUM, SHEET_COL_CAMPAIGN

function sheetUrl(): string | undefined {
  if (process.env.GOOGLE_SHEET_CSV_URL) return process.env.GOOGLE_SHEET_CSV_URL;
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) return undefined;
  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  // Prefer a tab name when provided (e.g. "[IMERSÃO GIS][JUL26] Trackeamento de Lançamento"),
  // otherwise fall back to a numeric gid.
  const tab = process.env.GOOGLE_SHEET_TAB;
  if (tab) return `${base}&sheet=${encodeURIComponent(tab)}`;
  const gid = process.env.GOOGLE_SHEET_GID || "0";
  return `${base}&gid=${gid}`;
}

export function isSheetsConfigured(): boolean {
  return Boolean(sheetUrl());
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const DEFAULTS: Record<string, string[]> = {
  name: ["nome", "name", "full name", "nome completo", "lead"],
  email: ["email", "e-mail", "e mail"],
  phone: ["telefone", "phone", "whatsapp", "celular", "fone", "phone number", "whatsapp/telefone"],
  date: ["data", "date", "timestamp", "carimbo de data/hora", "created", "created_time", "data/hora"],
  source: ["utm_source", "utm source", "source", "origem", "fonte"],
  medium: ["utm_medium", "utm medium", "medium", "meio", "midia", "mídia"],
  campaign: ["utm_campaign", "utm campaign", "campaign", "campanha"],
  term: ["utm_term", "utm term", "term", "termo", "conjunto", "publico", "público", "adset"],
  content: ["utm_content", "utm content", "content", "conteudo", "conteúdo", "anuncio", "anúncio", "criativo", "ad"],
};

function resolveIndex(headers: string[], key: string, override?: string): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  if (override) {
    const i = lower.indexOf(override.trim().toLowerCase());
    if (i >= 0) return i;
  }
  for (const cand of DEFAULTS[key]) {
    const i = lower.indexOf(cand);
    if (i >= 0) return i;
  }
  for (const cand of DEFAULTS[key]) {
    const i = lower.findIndex((h) => h.includes(cand));
    if (i >= 0) return i;
  }
  return -1;
}

function platformFromSource(source: string): Platform {
  const v = source.toLowerCase();
  if (v.includes("insta") || v === "ig") return "instagram";
  if (v.includes("face") || v === "fb") return "facebook";
  if (v.includes("whats") || v.includes("wpp")) return "whatsapp";
  if (v.includes("mail")) return "email";
  if (v.includes("google") || v.includes("goog")) return "google";
  if (v.includes("organic") || v.includes("organico") || v.includes("orgânico") || v.includes("bio")) return "organic";
  return "unknown";
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    const [, d, m, y, hh = "0", mm = "0", ss = "0"] = br;
    return new Date(+y, +m - 1, +d, +hh, +mm, +ss).toISOString();
  }
  const t = Date.parse(raw);
  return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

export async function fetchSheetLeads(): Promise<LeadRow[]> {
  const url = sheetUrl();
  if (!url) return [];
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Google Sheet ${res.status}`);
  const rows = parseCsv(await res.text());
  if (rows.length < 2) return [];

  const headers = rows[0];
  const idx = {
    name: resolveIndex(headers, "name", process.env.SHEET_COL_NAME),
    email: resolveIndex(headers, "email", process.env.SHEET_COL_EMAIL),
    phone: resolveIndex(headers, "phone", process.env.SHEET_COL_PHONE),
    date: resolveIndex(headers, "date", process.env.SHEET_COL_DATE),
    source: resolveIndex(headers, "source", process.env.SHEET_COL_SOURCE),
    medium: resolveIndex(headers, "medium", process.env.SHEET_COL_MEDIUM),
    campaign: resolveIndex(headers, "campaign", process.env.SHEET_COL_CAMPAIGN),
    term: resolveIndex(headers, "term", process.env.SHEET_COL_TERM),
    content: resolveIndex(headers, "content", process.env.SHEET_COL_CONTENT),
  };
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] || "").trim() : "");

  return rows.slice(1).map((r, i) => {
    const source = at(r, idx.source);
    return {
      id: `sheet_${i}`,
      name: at(r, idx.name) || "—",
      email: at(r, idx.email),
      phone: at(r, idx.phone),
      source: source || "—",
      medium: at(r, idx.medium),
      campaign: at(r, idx.campaign) || "Página de captura",
      term: at(r, idx.term),
      content: at(r, idx.content),
      platform: platformFromSource(source),
      createdTime: parseDate(at(r, idx.date)),
    };
  });
}
