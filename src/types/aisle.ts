export const MACRO_AISLE_IDS = [
  "fruits-legumes",
  "boulangerie",
  "frais-cremerie",
  "boucherie-poissonnerie",
  "epicerie-salee",
  "epicerie-sucree",
  "boissons",
  "hygiene-entretien",
] as const;

export type MacroAisleId = (typeof MACRO_AISLE_IDS)[number];

export interface MacroAisleDefinition {
  id: MacroAisleId;
  label: string;
  defaultOrder: number;
}

import type { IngestedItem } from "@/types/ingestion";

export interface AisleGroup {
  aisleId: MacroAisleId;
  label: string;
  items: IngestedItem[];
}
