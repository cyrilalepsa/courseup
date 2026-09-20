import { DIRECT_LIST_SUGGESTIONS } from "@/config/itemCatalog";
import type { ItemCategory } from "@/types/ingestion";
import type { N2ReceiptOcrItem } from "@shared/n2ReceiptOcr";

export interface MatchedReceiptLine {
  rawLabel: string;
  matchedName: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  category: ItemCategory;
  matchScore: number;
  catalogId?: string;
}

const HERITIA_ALIASES: { pattern: RegExp; label: string; category: ItemCategory }[] = [
  { pattern: /lait/i, label: "Lait demi-écrémé", category: "frais" },
  { pattern: /yaourt/i, label: "Yaourt nature", category: "frais" },
  { pattern: /tomate/i, label: "Tomates", category: "frais" },
  { pattern: /riz/i, label: "Riz basmati", category: "épicerie" },
  { pattern: /pate|pâte/i, label: "Pâtes complètes", category: "épicerie" },
  { pattern: /pain/i, label: "Pain complet", category: "épicerie" },
  { pattern: /eau/i, label: "Eau minérale", category: "boissons" },
];

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyScore(raw: string, candidate: string): number {
  const a = normalizeToken(raw);
  const b = normalizeToken(candidate);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 0.92;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 1 - dist / maxLen);
}

export function matchReceiptItemToCatalog(item: N2ReceiptOcrItem): MatchedReceiptLine {
  const rawLabel = item.raw_label;
  let best = { score: 0, label: rawLabel, category: "épicerie" as ItemCategory, id: undefined as string | undefined };

  for (const suggestion of DIRECT_LIST_SUGGESTIONS) {
    const score = fuzzyScore(rawLabel, suggestion.label);
    if (score > best.score) {
      best = {
        score,
        label: suggestion.label,
        category: suggestion.category,
        id: suggestion.id,
      };
    }
  }

  for (const alias of HERITIA_ALIASES) {
    if (alias.pattern.test(rawLabel)) {
      const score = Math.max(best.score, 0.88);
      if (score >= best.score) {
        best = { score, label: alias.label, category: alias.category, id: undefined };
      }
    }
  }

  const useCatalog = best.score >= 0.45;
  return {
    rawLabel,
    matchedName: useCatalog ? best.label : rawLabel,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    category: useCatalog ? best.category : "épicerie",
    matchScore: Number(best.score.toFixed(2)),
    catalogId: best.id,
  };
}

export function matchReceiptLines(items: N2ReceiptOcrItem[]): MatchedReceiptLine[] {
  return items.map(matchReceiptItemToCatalog);
}
