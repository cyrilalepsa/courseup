import { ITEM_FILTER_DEFINITIONS } from "@/config/itemCatalog";
import type { IngestedItem } from "@/types/ingestion";
import type {
  FilterPredicateId,
  ItemAttributes,
  ItemFilterDefinition,
} from "@/types/item";
import { normalizeItemAttributes } from "@/services/itemAttributeService";

export type FilterPredicate = (attributes: ItemAttributes) => boolean;

const FILTER_PREDICATES: Record<FilterPredicateId, FilterPredicate> = {
  low_glycemic: (attrs) => (attrs.glycemicIndex ?? 100) <= 55,
  gluten_free: (attrs) => attrs.isGlutenFree === true,
  low_sodium: (attrs) => attrs.isLowSodium === true,
  nutri_score_ab: (attrs) =>
    attrs.qualityScore === "A" || attrs.qualityScore === "B",
};

export function getFilterDefinitions(): ItemFilterDefinition[] {
  return ITEM_FILTER_DEFINITIONS;
}

export function itemMatchesFilter(
  item: IngestedItem,
  filterId: string,
): boolean {
  const definition = ITEM_FILTER_DEFINITIONS.find((f) => f.id === filterId);
  if (!definition) return true;
  const predicate = FILTER_PREDICATES[definition.predicateId];
  const attributes = normalizeItemAttributes(item);
  return predicate(attributes);
}

export function applyItemFilters(
  items: IngestedItem[],
  activeFilterIds: string[],
): IngestedItem[] {
  if (activeFilterIds.length === 0) return items;
  return items.filter((item) =>
    activeFilterIds.every((filterId) => itemMatchesFilter(item, filterId)),
  );
}

export function countMatchingItems(
  items: IngestedItem[],
  filterId: string,
): number {
  return items.filter((item) => itemMatchesFilter(item, filterId)).length;
}

export function filterOptimizerItems(
  items: IngestedItem[],
  activeFilterIds: string[],
): {
  visible: IngestedItem[];
  hiddenCount: number;
} {
  const visible = applyItemFilters(items, activeFilterIds);
  return {
    visible,
    hiddenCount: Math.max(0, items.length - visible.length),
  };
}
