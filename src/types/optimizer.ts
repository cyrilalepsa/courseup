import type { DriveStore } from "@/types/store";

export type OptimizationMode = "monopoly" | "multi-drive" | "hybrid-selys";

export type PartnerStoreId =
  | "carrefour"
  | "leclerc"
  | "auchan"
  | "lidl"
  | "aldi"
  | "selys-local";

export interface PartnerDrive {
  id: PartnerStoreId;
  name: string;
  type: "drive" | "local";
  affiliationRate: number;
  priceIndex: number;
  pickupMinutes: number;
  accentClass: string;
}

export interface AssignedLineItem {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface StoreSplit {
  store: PartnerDrive;
  items: AssignedLineItem[];
  subtotal: number;
  affiliationCashback: number;
  physicalStore?: DriveStore;
  displayName?: string;
  tripDistanceKm?: number;
}

export interface SavingsSummary {
  baselineTotal: number;
  optimizedTotal: number;
  savingsAmount: number;
  savingsPercent: number;
  storeCount: number;
  estimatedTrips: number;
  timeScoreLabel: string;
  totalTripDistanceKm: number;
}

export interface N2OGain {
  pointsEarned: number;
  conversionProgress: number;
  tierLabel: string;
  cashbackEuro: number;
  bonusLabel: string;
}

export interface OptimizedBasket {
  mode: OptimizationMode;
  splits: StoreSplit[];
  savings: SavingsSummary;
  n2o: N2OGain;
  itemCount: number;
}
