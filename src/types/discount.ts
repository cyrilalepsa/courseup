import type { ItemCategory } from "@/types/ingestion";

export type DiscountStoreId = "lidl" | "aldi";

export interface DiscountCatalogEntry {
  id: string;
  keywords: string[];
  category: ItemCategory;
  referenceLabel: string;
  discountLabel: string;
  store: DiscountStoreId;
  referenceStoreLabel: string;
  referenceUnitPrice: number;
  discountUnitPrice: number;
}

export interface DiscountSuggestion {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  referenceStore: string;
  referenceUnitPrice: number;
  referenceLineTotal: number;
  discountStore: DiscountStoreId;
  discountProductName: string;
  discountUnitPrice: number;
  discountLineTotal: number;
  savingsAmount: number;
  catalogEntryId: string;
}

export interface DiscountSuggestionsSummary {
  suggestions: DiscountSuggestion[];
  totalPotentialSavings: number;
  replaceableCount: number;
}
