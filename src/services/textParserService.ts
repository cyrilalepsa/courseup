import type { ItemCategory } from "@/types/ingestion";
import type { IngestedItem, IngestionItemSource } from "@/types/ingestion";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";

export interface ParsedLine {
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  lineTotal?: number;
  category: ItemCategory;
  confidenceScore: number;
}

const SKIP_LINE =
  /^(total|sous\s*total|tva|carte|esp[èe]ces|monnaie|merci|caissier|ticket|date|heure|tel|siret|tva|ht|ttc|\*+)/i;

const QTY_X_NAME_PRICE =
  /^(\d+)\s*[x×]\s*(.+?)\s+(\d+[.,]\d{2})\s*€?\s*$/i;

const NAME_WEIGHT_PRICE =
  /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|L|pcs?|u)\s*[-–]?\s*(\d+[.,]\d{2})\s*€?\s*$/i;

const NAME_DASH_PRICE = /^(.+?)\s*[-–]\s*(\d+[.,]\d{2})\s*€?\s*$/i;

const NAME_END_PRICE = /^(.+?)\s+(\d+[.,]\d{2})\s*€\s*$/i;

const QTY_UNIT_NAME = /^(\d+(?:[.,]\d+)?)\s*(kg|g|l|L|ml|cl|pcs?|u)\s+(.+)$/i;

const SIMPLE_LIST = /^(\d+(?:[.,]\d+)?)\s+(.+)$/;

function parseEuro(value: string): number {
  return parseFloat(value.replace(",", "."));
}

function normalizeName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\*+/g, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 80);
}

export function guessCategory(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (
    /lait|yaourt|beurre|oeuf|viande|poulet|poisson|saumon|fruit|pomme|tomate|salade|fromage|cr[èe]me|jambon|charcut|frais|legume|oignon|carotte/.test(
      n,
    )
  ) {
    return "frais";
  }
  if (
    /eau|jus|coca|bi[èe]re|vin|soda|boisson|caf[é]|th[ée]|cola|sparkling|limonade/.test(n)
  ) {
    return "boissons";
  }
  if (/lessive|shampo|dentif|papier\s*toilette|hygi[èe]ne|savon|gel\s*douche|mouchoir/.test(n)) {
    return "autre";
  }
  if (/pain|p[âa]te|riz|farine|huile|sucre|chips|biscuit|conserve|miel|moutarde|c[ée]r[ée]ale/.test(n)) {
    return "épicerie";
  }
  return "épicerie";
}

function lineToParsed(line: string, index: number): ParsedLine | null {
  const trimmed = line.trim();
  if (trimmed.length < 2 || SKIP_LINE.test(trimmed)) return null;

  let m = trimmed.match(QTY_X_NAME_PRICE);
  if (m) {
    const name = normalizeName(m[2]);
    const lineTotal = parseEuro(m[3]);
    return {
      name,
      quantity: parseInt(m[1], 10),
      unit: "u",
      lineTotal,
      unitPrice: Number((lineTotal / parseInt(m[1], 10)).toFixed(2)),
      category: guessCategory(name),
      confidenceScore: 0.9,
    };
  }

  m = trimmed.match(NAME_WEIGHT_PRICE);
  if (m) {
    const name = normalizeName(m[1]);
    return {
      name,
      quantity: parseFloat(m[2].replace(",", ".")),
      unit: m[3].toLowerCase(),
      lineTotal: parseEuro(m[4]),
      category: guessCategory(name),
      confidenceScore: 0.86,
    };
  }

  m = trimmed.match(NAME_DASH_PRICE) ?? trimmed.match(NAME_END_PRICE);
  if (m) {
    const name = normalizeName(m[1]);
    const lineTotal = parseEuro(m[2]);
    return {
      name,
      quantity: 1,
      unit: "u",
      lineTotal,
      unitPrice: lineTotal,
      category: guessCategory(name),
      confidenceScore: 0.82,
    };
  }

  m = trimmed.match(QTY_UNIT_NAME);
  if (m) {
    const name = normalizeName(m[3]);
    return {
      name,
      quantity: parseFloat(m[1].replace(",", ".")),
      unit: m[2].toLowerCase(),
      category: guessCategory(name),
      confidenceScore: 0.78,
    };
  }

  m = trimmed.match(SIMPLE_LIST);
  if (m) {
    const name = normalizeName(m[2]);
    return {
      name,
      quantity: parseFloat(m[1].replace(",", ".")),
      unit: "u",
      category: guessCategory(name),
      confidenceScore: 0.72,
    };
  }

  if (trimmed.length > 2 && !/\d+[.,]\d{2}/.test(trimmed)) {
    const name = normalizeName(trimmed);
    return {
      name,
      quantity: 1,
      unit: "u",
      category: guessCategory(name),
      confidenceScore: 0.65 - (index % 3) * 0.03,
    };
  }

  return null;
}

export function parseReceiptText(
  text: string,
  source: IngestionItemSource = "text",
): IngestedItem[] {
  const lines = text
    .split(/\r?\n/)
    .flatMap((block) => block.split(/;/))
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: IngestedItem[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const row = lineToParsed(lines[i], i);
    if (!row) continue;
    parsed.push(
      createIngestedItem(
        {
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          category: row.category,
          confidenceScore: Math.max(0.55, Math.min(0.98, row.confidenceScore)),
        },
        source,
      ),
    );
  }

  return parsed;
}

export function parseCsvText(text: string): IngestedItem[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("name") || header.includes("article");

  const rows = hasHeader ? lines.slice(1) : lines;
  const items: IngestedItem[] = [];

  for (const row of rows) {
    const cols = row.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length >= 2) {
      const name = normalizeName(cols[0]);
      const qty = parseFloat(cols[1]?.replace(",", ".") || "1") || 1;
      const unit = cols[2] || "u";
      items.push(
        createIngestedItem(
          {
            name,
            quantity: qty,
            unit,
            category: guessCategory(name),
            confidenceScore: 0.88,
          },
          "file",
        ),
      );
    } else {
      items.push(...parseReceiptText(row, "file"));
    }
  }

  return items;
}

export function parseImportedFileText(
  text: string,
  fileName: string,
): IngestedItem[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsvText(text);
  }
  return parseReceiptText(text, "file");
}
