export type IngestionItemSource =
  | "ocr"
  | "file"
  | "text"
  | "heritia"
  | "mamandouce";

export type IngestionSource = "file" | "text" | "bridge";

export type ItemCategory = "frais" | "épicerie" | "boissons" | "autre";

export type QualityScore = "A" | "B" | "C" | "D" | "E" | "F";

export interface IngestedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  confidenceScore: number;
  source: IngestionItemSource;
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
