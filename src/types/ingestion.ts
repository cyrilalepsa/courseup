import type { ItemAttributes, QualityScore } from "@/types/item";

export type { QualityScore } from "@/types/item";

export type IngestionItemSource =
  | "ocr"
  | "file"
  | "text"
  | "heritia"
  | "mamandouce";

export type IngestionSource = "file" | "text" | "bridge";

export type ItemCategory = "frais" | "épicerie" | "boissons" | "autre";

export interface IngestedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  confidenceScore: number;
  source: IngestionItemSource;
  attributes: ItemAttributes;
  /** Miroir de attributes.qualityScore pour compatibilité ascendante */
  qualityScore?: QualityScore;
}

export interface EcosystemImport {
  id: string;
  sourceApp: "Heritia" | "MamanDouce";
  title: string;
  date: string;
  itemCount: number;
  items: Partial<IngestedItem>[];
}
