export type QualityScore = "A" | "B" | "C" | "D" | "E" | "F";

export interface ItemAttributes {
  qualityScore?: QualityScore;
  glycemicIndex?: number;
  isGlutenFree?: boolean;
  isLowSodium?: boolean;
  isLowGlycemic?: boolean;
  tags: string[];
}

export const EMPTY_ITEM_ATTRIBUTES: ItemAttributes = {
  tags: [],
};

export type FilterPredicateId =
  | "low_glycemic"
  | "gluten_free"
  | "low_sodium"
  | "nutri_score_ab";

export interface ItemFilterDefinition {
  id: string;
  label: string;
  description: string;
  predicateId: FilterPredicateId;
}

export interface ItemTagDefinition {
  id: string;
  label: string;
  /** Attribut booléen ou tag string à appliquer à la saisie */
  apply: Partial<ItemAttributes> & { tagId?: string };
}

export interface AutocompleteSuggestion {
  id: string;
  label: string;
  category?: string;
  defaultAttributes?: Partial<ItemAttributes>;
}
