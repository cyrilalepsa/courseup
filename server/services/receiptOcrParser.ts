import type { N2ReceiptOcrItem, N2ReceiptOcrResponse } from "../../shared/n2ReceiptOcr.js";

const NOISE_LINE =
  /^(total|sous\s*total|tva|carte|esp[èe]ces|monnaie|merci|caissier|ticket|date|heure|tel|siret|ht|ttc|facture|client|caisse|remise|fid[ée]lit[ée]|cb|visa|mastercard|american|paiement|autorisation|tpe|\*+)/i;

const SIRET_LINE = /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b|\bsiret\b/i;
const CARD_LINE = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
const TIMESTAMP_LINE =
  /\b\d{1,2}[/.:-]\d{1,2}[/.:-]\d{2,4}(?:\s+\d{1,2}:\d{2})?\b|\b\d{1,2}:\d{2}(?::\d{2})?\b/;
const LEGAL_LINE =
  /\b(mentions?\s+l[ée]gales|rcs|capital|sasu|sarl|sas|n[°o]\s*tva|intracom)\b/i;

const QTY_X_NAME_PRICE =
  /^(\d+)\s*[x×]\s*(.+?)\s+(\d+[.,]\d{2})\s*€?\s*$/i;
const NAME_END_PRICE = /^(.+?)\s+(\d+[.,]\d{2})\s*€?\s*$/i;
const NAME_DASH_PRICE = /^(.+?)\s*[-–]\s*(\d+[.,]\d{2})\s*€?\s*$/i;

const MERCHANT_HINT =
  /^(carrefour|leclerc|auchan|lidl|aldi|intermarch[ée]|monoprix|franprix|casino|syst[èe]me\s*u)/i;

function parseEuro(value: string): number {
  return parseFloat(value.replace(",", "."));
}

function normalizeLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/\*+/g, "").trim();
}

function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2) return true;
  if (NOISE_LINE.test(trimmed)) return true;
  if (SIRET_LINE.test(trimmed)) return true;
  if (CARD_LINE.test(trimmed)) return true;
  if (TIMESTAMP_LINE.test(trimmed) && trimmed.length < 28) return true;
  if (LEGAL_LINE.test(trimmed)) return true;
  if (/^\d{10,}$/.test(trimmed.replace(/\s/g, ""))) return true;
  return false;
}

function parseLine(line: string): N2ReceiptOcrItem | null {
  const trimmed = line.trim();
  if (isNoiseLine(trimmed)) return null;

  let match = trimmed.match(QTY_X_NAME_PRICE);
  if (match) {
    const qty = parseInt(match[1], 10);
    const total = parseEuro(match[3]);
    return {
      raw_label: normalizeLabel(match[2]),
      quantity: qty,
      unit_price: Number((total / qty).toFixed(2)),
      total_price: total,
    };
  }

  match = trimmed.match(NAME_DASH_PRICE) ?? trimmed.match(NAME_END_PRICE);
  if (match) {
    const total = parseEuro(match[2]);
    return {
      raw_label: normalizeLabel(match[1]),
      quantity: 1,
      unit_price: total,
      total_price: total,
    };
  }

  if (trimmed.length > 2 && !/\d+[.,]\d{2}/.test(trimmed)) {
    return {
      raw_label: normalizeLabel(trimmed),
      quantity: 1,
      unit_price: null,
      total_price: null,
    };
  }

  return null;
}

function extractMerchant(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    if (MERCHANT_HINT.test(line.trim())) {
      return normalizeLabel(line);
    }
  }
  return null;
}

function extractDateTime(lines: string[]): string | null {
  for (const line of lines) {
    const m = line.match(
      /\b(\d{1,2}[/.:-]\d{1,2}[/.:-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?\b/,
    );
    if (m) {
      return m[2] ? `${m[1]} ${m[2]}` : m[1];
    }
  }
  return null;
}

function extractTotal(lines: string[]): number | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = lines[i].match(/total\s*(?:ttc|€)?\s*[:.]?\s*(\d+[.,]\d{2})/i);
    if (m) return parseEuro(m[1]);
  }
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = lines[i].match(/^total\s+(\d+[.,]\d{2})/i);
    if (m) return parseEuro(m[1]);
  }
  return null;
}

export function parseReceiptTextToN2Response(
  text: string,
  merchantHint?: string,
): N2ReceiptOcrResponse {
  const lines = text
    .split(/\r?\n/)
    .flatMap((block) => block.split(/;/))
    .map((l) => l.trim())
    .filter(Boolean);

  const items: N2ReceiptOcrItem[] = [];
  for (const line of lines) {
    const row = parseLine(line);
    if (row && row.raw_label.length > 1) items.push(row);
  }

  const itemTotal = items.reduce((sum, row) => sum + (row.total_price ?? 0), 0);
  const total = extractTotal(lines) ?? (itemTotal > 0 ? Number(itemTotal.toFixed(2)) : null);

  return {
    merchant_name: merchantHint ?? extractMerchant(lines),
    date_time: extractDateTime(lines),
    items,
    total_amount: total,
    confidence: items.length > 0 ? 0.82 : 0.35,
  };
}
