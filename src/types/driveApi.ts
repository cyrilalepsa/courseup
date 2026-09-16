import type { ItemCategory } from "@/types/ingestion";
import type { QualityScore } from "@/types/item";

/** Enregistrement brut renvoyé par un connecteur Drive (mock ou API). */
export interface DriveApiProductRecord {
  sku: string;
  name: string;
  priceEuro: number;
  aisleLabel: string;
  category: ItemCategory;
  qualityScore?: QualityScore;
  glycemicIndex?: number;
  isGlutenFree?: boolean;
  isLowSodium?: boolean;
  isLowGlycemic?: boolean;
  connectorId: string;
}

export interface DriveProductHit {
  sku: string;
  name: string;
  priceEuro: number;
  aisleLabel: string;
  category: ItemCategory;
  connectorId: string;
  connectorLabel: string;
  attributes: {
    qualityScore?: QualityScore;
    glycemicIndex?: number;
    isGlutenFree?: boolean;
    isLowSodium?: boolean;
    isLowGlycemic?: boolean;
    tags: string[];
  };
}

export interface DriveSearchQuery {
  text: string;
  connectorIds?: string[];
  filterIds?: string[];
  limit?: number;
}

export interface DriveSearchResult {
  hits: DriveProductHit[];
  source: "mock" | "live";
  queriedAt: string;
}
