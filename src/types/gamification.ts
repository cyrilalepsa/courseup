export type GamificationBadgeId =
  | "eco-shopper"
  | "discount-hunter"
  | "selys-artisan"
  | "heritia-anti-waste";

export interface GamificationBadgeRecord {
  id: GamificationBadgeId;
  unlockedAt: string;
}

export interface GamificationEvaluationInput {
  totalSavingsEuro: number;
  hasDiscountStop: boolean;
  selysItemCount: number;
  freshItemCount: number;
  heritiaExportQueued: boolean;
}
