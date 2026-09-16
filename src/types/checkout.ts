export interface LoyaltyCardRecord {
  id: string;
  label: string;
  issuer: string;
  memberId: string;
  barcodePayload: string;
}

export interface CheckoutVoucherRecord {
  id: string;
  label: string;
  valueEuro: number;
  code: string;
  expiresAt?: string;
}

export interface CheckoutWalletState {
  loyaltyCards: LoyaltyCardRecord[];
  vouchers: CheckoutVoucherRecord[];
}
