import {
  ensureItemAttributes,
  ensureItemAttributesList,
} from "@/services/itemAttributeService";

export {
  ensureItemAttributes,
  ensureItemAttributesList,
  inferItemAttributes,
  findAutocompleteSuggestions,
  mergeItemAttributes,
} from "@/services/itemAttributeService";

/** @deprecated Utiliser ensureItemAttributesList */
export const ensureQualityScores = ensureItemAttributesList;

/** @deprecated Utiliser ensureItemAttributes */
export const ensureItemQualityScore = ensureItemAttributes;
