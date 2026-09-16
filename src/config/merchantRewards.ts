import type { MerchantRewardOffer } from "@/types/rewards";

/** Catalogue paramétrable — Privilèges artisans Selys */
export const SELYS_MERCHANT_REWARDS: MerchantRewardOffer[] = [
  {
    id: "selys-boulanger-accompagnement",
    merchantId: "artisan-boulanger-halles",
    merchantName: "Boulangerie des Halles",
    title: "Accompagnement offert",
    description: "Conseil dégustation & accords locaux lors de votre retrait.",
    n2oCost: 120,
  },
  {
    id: "selys-fromager-gourmand",
    merchantId: "fromager-valette",
    merchantName: "Fromagerie du Val",
    title: "Produit gourmand offert",
    description: "Une portion découverte offerte sur présentation du pass CourseUp.",
    n2oCost: 180,
  },
  {
    id: "selys-caviste-surclassement",
    merchantId: "caviste-garde",
    merchantName: "Caviste du Circuit",
    title: "Surclassement millésime",
    description: "Échange contre jetons N2O : surclassement d'une bouteille sélectionnée.",
    n2oCost: 240,
  },
];
