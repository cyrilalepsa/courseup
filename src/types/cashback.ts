export interface CashbackEngineConfig {
  /** Montant d'économie réelle (€) créditant 1 jeton N2O */
  eurosPerN2OToken: number;
  /** Inclure les économies issues des stops discount (Lidl/Aldi) */
  includeDiscountSavings: boolean;
}

export type CashbackLedgerSource = "dispatch" | "checkout_pass" | "adjustment";

export interface CashbackLedgerEntry {
  id: string;
  createdAt: string;
  savingsEuro: number;
  tokensGranted: number;
  source: CashbackLedgerSource;
  orderId?: string;
  label?: string;
}

export interface CashbackCreditResult {
  savingsEuro: number;
  tokensGranted: number;
  config: CashbackEngineConfig;
  ledgerEntry: CashbackLedgerEntry;
}
