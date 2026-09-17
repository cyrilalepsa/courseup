export type CommissionModel = "cpa" | "cpl";

export interface AffiliationPartnerParams {
  storeId: string;
  partnerId: string;
  subId: string;
  cpaRatePercent: number;
  cplRateEuro: number;
  webhookUrl: string;
}

export interface AffiliationRedirectEvent {
  event: "drive_redirect";
  storeId: string;
  storeName: string;
  orderId?: string;
  checkoutId?: string;
  cartSubtotalEuro: number;
  estimatedCommissionEuro: number;
  partnerId: string;
  subId: string;
  model: CommissionModel;
  tagged: boolean;
  occurredAt: string;
}

export interface MonetizationSessionTotals {
  revenueEuro: number;
  commissionEuro: number;
  redirectCount: number;
  ledgerEntryCount: number;
}
