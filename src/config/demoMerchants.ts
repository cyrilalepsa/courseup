import type { DemoMerchantProfile } from "@/types/demoMerchant";

/** Jeux de données commerçants Selys pour recettes Cockpit / mode démo */
export const DEMO_SELYS_MERCHANTS: DemoMerchantProfile[] = [
  {
    id: "rotisserie-artisanale-toulon",
    name: "Rôtisserie artisanale du Port",
    category: "Traiteur chaud",
    description: "Volailles label rouge, garnitures maison et jus de cuisson.",
    rewards: [
      {
        id: "demo-roti-frites",
        merchantId: "rotisserie-artisanale-toulon",
        merchantName: "Rôtisserie artisanale du Port",
        title: "Barquette de frites rôties offerte",
        description: "Accompagnement croustillant offert contre jetons N2O.",
        n2oCost: 5,
      },
      {
        id: "demo-roti-jus",
        merchantId: "rotisserie-artisanale-toulon",
        merchantName: "Rôtisserie artisanale du Port",
        title: "Jus de rôti offert",
        description: "Petit format offert pour vos plats du soir.",
        n2oCost: 8,
      },
    ],
  },
  {
    id: "boulangerie-quartier-valette",
    name: "Boulangerie du quartier",
    category: "Boulangerie-pâtisserie",
    description: "Pains au levain, viennoiseries et pâtisseries artisanales.",
    rewards: [
      {
        id: "demo-boulanger-croissant",
        merchantId: "boulangerie-quartier-valette",
        merchantName: "Boulangerie du quartier",
        title: "Croissant pur beurre offert",
        description: "Un croissant offert le matin lors du retrait Click & Collect.",
        n2oCost: 4,
      },
      {
        id: "demo-boulanger-pain",
        merchantId: "boulangerie-quartier-valette",
        merchantName: "Boulangerie du quartier",
        title: "Pain complet offert",
        description: "Baguette ou pain complet selon stock du jour.",
        n2oCost: 10,
      },
    ],
  },
  {
    id: "fromager-terroir-selys",
    name: "Fromagerie Terroir & Selys",
    category: "Fromagerie",
    description: "Fromages AOP locaux et plateaux dégustation.",
    rewards: [
      {
        id: "demo-fromage-degustation",
        merchantId: "fromager-terroir-selys",
        merchantName: "Fromagerie Terroir & Selys",
        title: "Plateau dégustation offert",
        description: "Trois portions découverte pour les détenteurs VIP.",
        n2oCost: 15,
      },
    ],
  },
];
