import type { CheckoutWalletState } from "@/types/checkout";

export const DEFAULT_CHECKOUT_WALLET: CheckoutWalletState = {
  loyaltyCards: [
    {
      id: "neria-n2o",
      label: "Carte NeriaCorp N2O",
      issuer: "NeriaCorp",
      memberId: "NC-N2O-LOCAL",
      barcodePayload: "NERIA-N2O-WALLET",
    },
    {
      id: "carrefour-pass",
      label: "Carrefour & moi",
      issuer: "Carrefour",
      memberId: "CF-****-4821",
      barcodePayload: "CF4821COURSEUP",
    },
    {
      id: "leclerc-carte",
      label: "Carte E.Leclerc",
      issuer: "Leclerc",
      memberId: "LE-****-9033",
      barcodePayload: "LE9033COURSEUP",
    },
  ],
  vouchers: [
    {
      id: "voucher-selys-5",
      label: "Bon Selys — retrait local",
      valueEuro: 5,
      code: "SELYS-5-OFF",
    },
    {
      id: "voucher-drive-3",
      label: "Remise drive affilié",
      valueEuro: 3,
      code: "DRIVE-AFF-3",
    },
  ],
};
