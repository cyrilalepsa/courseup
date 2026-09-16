import type {
  AutocompleteSuggestion,
  ItemFilterDefinition,
  ItemTagDefinition,
  QualityScore,
} from "@/types/item";

export const QUALITY_SCORE_VALUES: QualityScore[] = ["A", "B", "C", "D", "E", "F"];

export const ITEM_FILTER_DEFINITIONS: ItemFilterDefinition[] = [
  {
    id: "low_glycemic",
    label: "IG bas",
    description: "Indice glycémique ≤ 55",
    predicateId: "low_glycemic",
  },
  {
    id: "gluten_free",
    label: "Sans gluten",
    description: "Produits sans gluten",
    predicateId: "gluten_free",
  },
  {
    id: "low_sodium",
    label: "Pauvre en sel",
    description: "Faible teneur en sodium",
    predicateId: "low_sodium",
  },
  {
    id: "nutri_ab",
    label: "Nutri-Score A/B",
    description: "Meilleurs scores nutritionnels",
    predicateId: "nutri_score_ab",
  },
];

export const ITEM_TAG_DEFINITIONS: ItemTagDefinition[] = [
  {
    id: "sans-gluten",
    label: "Sans gluten",
    apply: { isGlutenFree: true, tagId: "sans-gluten" },
  },
  {
    id: "ig-bas",
    label: "IG bas",
    apply: { glycemicIndex: 45, tagId: "ig-bas" },
  },
  {
    id: "pauvre-sel",
    label: "Pauvre en sel",
    apply: { isLowSodium: true, tagId: "pauvre-sel" },
  },
  {
    id: "bio",
    label: "Bio",
    apply: { tagId: "bio", qualityScore: "A" },
  },
  {
    id: "vegan",
    label: "Vegan",
    apply: { tagId: "vegan" },
  },
];

export const DIRECT_LIST_SUGGESTIONS: AutocompleteSuggestion[] = [
  {
    id: "lait",
    label: "Lait demi-écrémé",
    category: "frais",
    defaultAttributes: { glycemicIndex: 35, qualityScore: "B", tags: ["frais"] },
  },
  {
    id: "pain",
    label: "Pain complet",
    category: "épicerie",
    defaultAttributes: { glycemicIndex: 50, isGlutenFree: false, qualityScore: "B" },
  },
  {
    id: "riz-basmati",
    label: "Riz basmati",
    category: "épicerie",
    defaultAttributes: { glycemicIndex: 58, isGlutenFree: true, qualityScore: "B", tags: ["sans-gluten"] },
  },
  {
    id: "pates-complet",
    label: "Pâtes complètes",
    category: "épicerie",
    defaultAttributes: { glycemicIndex: 45, qualityScore: "B" },
  },
  {
    id: "eau",
    label: "Eau minérale",
    category: "boissons",
    defaultAttributes: { glycemicIndex: 0, isLowSodium: true, qualityScore: "A" },
  },
  {
    id: "tomates",
    label: "Tomates",
    category: "frais",
    defaultAttributes: { glycemicIndex: 15, qualityScore: "A", tags: ["vegan"] },
  },
  {
    id: "yaourt",
    label: "Yaourt nature",
    category: "frais",
    defaultAttributes: { glycemicIndex: 35, qualityScore: "B" },
  },
  {
    id: "lessive",
    label: "Lessive",
    category: "autre",
    defaultAttributes: { tags: ["entretien"] },
  },
];
