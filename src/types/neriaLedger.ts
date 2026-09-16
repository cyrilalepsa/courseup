import type { CommissionModel } from "@/types/monetization";

export interface NeriaLedgerEntry {
  id: string;
  sessionId: string;
  createdAt: string;
  orderId?: string;
  checkoutId?: string;
  storeId: string;
  storeName: string;
  cartSubtotalEuro: number;
  estimatedCommissionEuro: number;
  commissionModel: CommissionModel;
  partnerId: string;
  subId: string;
  affiliationTagged: boolean;
}

export interface NeriaCockpitLedgerBatch {
  schema: "neriacorp.monetization.ledger.v1";
  sessionId: string;
  exportedAt: string;
  affiliationMode: "active" | "passive";
  entries: NeriaLedgerEntry[];
  totals: {
    revenueEuro: number;
    commissionEuro: number;
  };
}
