import type { IngestedItem, ItemCategory, QualityScore } from "@/types/ingestion";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const GRADE_ORDER: QualityScore[] = ["A", "B", "C", "D", "E", "F"];

export function inferQualityScore(
  item: Pick<IngestedItem, "name" | "category">,
): QualityScore {
  const name = normalize(item.name);

  if (/(bio|legume|fruit|salade|epinard|carotte|pomme|poire)/.test(name)) return "A";
  if (/(yaourt|lait|fromage|pain complet|cereales complete)/.test(name)) return "B";
  if (/(riz|pates|huile|conserve|boeuf hache 5)/.test(name)) return "C";
  if (/(sauce|chips|biscuit|gateau|pizza)/.test(name)) return "D";
  if (/(soda|cola|bonbon|glace|nutella)/.test(name)) return "E";
  if (/(alcool|whisky|biere forte|snack gras)/.test(name)) return "F";

  const categoryBias: Record<ItemCategory, number> = {
    frais: 0,
    épicerie: 1,
    boissons: 2,
    autre: 1,
  };

  const idx = Math.min(
    GRADE_ORDER.length - 1,
    categoryBias[item.category] + (hashSeed(item.name) % 3),
  );
  return GRADE_ORDER[idx];
}

export function ensureItemQualityScore(item: IngestedItem): IngestedItem {
  if (item.qualityScore) return item;
  return { ...item, qualityScore: inferQualityScore(item) };
}

export function ensureQualityScores(items: IngestedItem[]): IngestedItem[] {
  return items.map(ensureItemQualityScore);
}

export const QUALITY_SCORE_LABELS: Record<QualityScore, string> = {
  A: "Nutri-Score A",
  B: "Nutri-Score B",
  C: "Nutri-Score C",
  D: "Nutri-Score D",
  E: "Nutri-Score E",
  F: "Nutri-Score F",
};
