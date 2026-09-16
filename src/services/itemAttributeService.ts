import { DIRECT_LIST_SUGGESTIONS } from "@/config/itemCatalog";
import type { IngestedItem, ItemCategory } from "@/types/ingestion";
import type { ItemAttributes, QualityScore } from "@/types/item";
import { EMPTY_ITEM_ATTRIBUTES } from "@/types/item";

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

interface AttributeRule {
  id: string;
  keywords: string[];
  patch: Partial<ItemAttributes>;
}

const ATTRIBUTE_RULES: AttributeRule[] = [
  {
    id: "produce",
    keywords: ["tomate", "salade", "fruit", "legume", "pomme", "carotte"],
    patch: { qualityScore: "A", glycemicIndex: 20, tags: ["vegan"] },
  },
  {
    id: "gluten-free-grain",
    keywords: ["riz", "quinoa", "mais"],
    patch: { isGlutenFree: true, glycemicIndex: 55 },
  },
  {
    id: "low-sodium",
    keywords: ["eau", "mineral", "nature", "bio legume"],
    patch: { isLowSodium: true },
  },
  {
    id: "high-gi",
    keywords: ["pain blanc", "biscuit", "sucre", "soda", "cola"],
    patch: { glycemicIndex: 75, qualityScore: "D" },
  },
  {
    id: "dairy",
    keywords: ["lait", "yaourt", "fromage"],
    patch: { glycemicIndex: 35, qualityScore: "B" },
  },
];

const CATEGORY_GI: Record<ItemCategory, number> = {
  frais: 40,
  épicerie: 55,
  boissons: 50,
  autre: 45,
};

function mergeTags(base: string[], extra: string[] = []): string[] {
  return [...new Set([...base, ...extra])];
}

function inferQualityFromGi(gi: number): QualityScore {
  if (gi <= 25) return "A";
  if (gi <= 45) return "B";
  if (gi <= 55) return "C";
  if (gi <= 65) return "D";
  if (gi <= 75) return "E";
  return "F";
}

export function inferItemAttributes(
  item: Pick<IngestedItem, "name" | "category">,
): ItemAttributes {
  const name = normalize(item.name);
  let attributes: ItemAttributes = {
    ...EMPTY_ITEM_ATTRIBUTES,
    glycemicIndex: CATEGORY_GI[item.category] + (hashSeed(item.name) % 12),
  };

  for (const rule of ATTRIBUTE_RULES) {
    if (rule.keywords.some((kw) => name.includes(normalize(kw)))) {
      attributes = {
        ...attributes,
        ...rule.patch,
        tags: mergeTags(attributes.tags, rule.patch.tags),
      };
    }
  }

  if (!attributes.qualityScore) {
    attributes.qualityScore = inferQualityFromGi(attributes.glycemicIndex ?? 55);
  }

  return attributes;
}

export function mergeItemAttributes(
  base: ItemAttributes,
  patch: Partial<ItemAttributes> & { tagId?: string },
): ItemAttributes {
  const { tagId, tags: patchTags, ...rest } = patch;
  return {
    ...base,
    ...rest,
    tags: [...new Set([...base.tags, ...(patchTags ?? []), ...(tagId ? [tagId] : [])])],
  };
}

export function normalizeItemAttributes(item: IngestedItem): ItemAttributes {
  const legacyScore = item.qualityScore ?? item.attributes?.qualityScore;
  const base = item.attributes ?? EMPTY_ITEM_ATTRIBUTES;
  const inferred = inferItemAttributes(item);

  return {
    qualityScore: legacyScore ?? base.qualityScore ?? inferred.qualityScore,
    glycemicIndex: base.glycemicIndex ?? inferred.glycemicIndex,
    isGlutenFree: base.isGlutenFree ?? inferred.isGlutenFree,
    isLowSodium: base.isLowSodium ?? inferred.isLowSodium,
    tags: mergeTags(inferred.tags, base.tags),
  };
}

export function ensureItemAttributes(item: IngestedItem): IngestedItem {
  const attributes = normalizeItemAttributes(item);
  return {
    ...item,
    attributes,
    qualityScore: attributes.qualityScore,
  };
}

export function ensureItemAttributesList(items: IngestedItem[]): IngestedItem[] {
  return items.map(ensureItemAttributes);
}

export function findAutocompleteSuggestions(query: string, limit = 6) {
  const q = normalize(query.trim());
  if (!q) return DIRECT_LIST_SUGGESTIONS.slice(0, limit);
  return DIRECT_LIST_SUGGESTIONS.filter((s) => normalize(s.label).includes(q)).slice(
    0,
    limit,
  );
}
