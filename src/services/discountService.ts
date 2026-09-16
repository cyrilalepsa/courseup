import type { IngestedItem } from "@/types/ingestion";
import type {
  DiscountCatalogEntry,
  DiscountStoreId,
  DiscountSuggestion,
  DiscountSuggestionsSummary,
} from "@/types/discount";

/** Coût marginal estimé d'un arrêt discount (€ / km aller-retour). */
export const DISCOUNT_TRIP_COST_PER_KM = 0.35;

/** Distance par défaut si pas de magasin sélectionné (km aller simple). */
export const DEFAULT_DISCOUNT_TRIP_KM_ONE_WAY = 2.1;

export const DISCOUNT_STORE_LABELS: Record<DiscountStoreId, string> = {
  lidl: "Lidl",
  aldi: "Aldi",
};

/**
 * Catalogue mock PGC — équivalences marques distributeur vs grandes surfaces.
 */
export const DISCOUNT_PGC_CATALOG: DiscountCatalogEntry[] = [
  {
    id: "pates-penne",
    keywords: ["pate", "pâtes", "penne", "spaghetti", "barilla"],
    category: "épicerie",
    referenceLabel: "Pâtes Barilla",
    discountLabel: "Pâtes Combino",
    store: "lidl",
    referenceStoreLabel: "Leclerc",
    referenceUnitPrice: 1.15,
    discountUnitPrice: 0.89,
  },
  {
    id: "huile-tournesol",
    keywords: ["huile", "tournesol", "olive"],
    category: "épicerie",
    referenceLabel: "Huile Puget 1L",
    discountLabel: "Huile Lidl Bio 1L",
    store: "lidl",
    referenceStoreLabel: "Carrefour",
    referenceUnitPrice: 4.29,
    discountUnitPrice: 3.49,
  },
  {
    id: "lait-uht",
    keywords: ["lait", "demi", "écrém", "ecrem"],
    category: "frais",
    referenceLabel: "Lait Lactel 1L",
    discountLabel: "Milbona UHT 1L",
    store: "lidl",
    referenceStoreLabel: "Leclerc",
    referenceUnitPrice: 1.09,
    discountUnitPrice: 0.79,
  },
  {
    id: "yaourt",
    keywords: ["yaourt", "yogurt", "nature"],
    category: "frais",
    referenceLabel: "Yaourt Danone x8",
    discountLabel: "Yaourt Milbona x8",
    store: "lidl",
    referenceStoreLabel: "Auchan",
    referenceUnitPrice: 2.45,
    discountUnitPrice: 1.69,
  },
  {
    id: "riz",
    keywords: ["riz", "basmati", "thai"],
    category: "épicerie",
    referenceLabel: "Riz Uncle Ben's 1kg",
    discountLabel: "Riz Golden Sun 1kg",
    store: "aldi",
    referenceStoreLabel: "Leclerc",
    referenceUnitPrice: 2.89,
    discountUnitPrice: 1.99,
  },
  {
    id: "lessive",
    keywords: ["lessive", "capsule", "ariel", "persil"],
    category: "autre",
    referenceLabel: "Lessive Ariel 30 doses",
    discountLabel: "Tandil 30 doses",
    store: "aldi",
    referenceStoreLabel: "Carrefour",
    referenceUnitPrice: 9.9,
    discountUnitPrice: 6.49,
  },
  {
    id: "shampoing",
    keywords: ["shampoing", "shampoo", "cheveux", "head"],
    category: "autre",
    referenceLabel: "Head & Shoulders 400ml",
    discountLabel: "Visage & Cheveux Aldi 400ml",
    store: "aldi",
    referenceStoreLabel: "Leclerc",
    referenceUnitPrice: 4.75,
    discountUnitPrice: 2.99,
  },
  {
    id: "papier-toilette",
    keywords: ["papier", "toilette", "essuie"],
    category: "autre",
    referenceLabel: "Lotus X12",
    discountLabel: "Softly X12",
    store: "lidl",
    referenceStoreLabel: "Intermarché",
    referenceUnitPrice: 5.49,
    discountUnitPrice: 3.99,
  },
  {
    id: "eau",
    keywords: ["eau", "minérale", "minerale", "bouteille"],
    category: "boissons",
    referenceLabel: "Evian 6x1.5L",
    discountLabel: "Saguaro 6x1.5L",
    store: "aldi",
    referenceStoreLabel: "Leclerc",
    referenceUnitPrice: 3.89,
    discountUnitPrice: 2.49,
  },
  {
    id: "jus-orange",
    keywords: ["jus", "orange", "multivitamine"],
    category: "boissons",
    referenceLabel: "Tropicana 1L",
    discountLabel: "Orange Juice Aldi 1L",
    store: "aldi",
    referenceStoreLabel: "Carrefour",
    referenceUnitPrice: 2.69,
    discountUnitPrice: 1.79,
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

function findCatalogMatch(item: IngestedItem): DiscountCatalogEntry | null {
  const hay = normalize(item.name);
  let best: DiscountCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of DISCOUNT_PGC_CATALOG) {
    let score = 0;
    for (const kw of entry.keywords) {
      const needle = normalize(kw.trim());
      if (needle && hay.includes(needle)) score += needle.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore > 0 ? best : null;
}

export function findDiscountEntryForItem(item: IngestedItem): DiscountCatalogEntry | null {
  const byName = DISCOUNT_PGC_CATALOG.find(
    (e) => normalize(item.name) === normalize(e.discountLabel),
  );
  if (byName) return byName;
  return findCatalogMatch(item);
}

export function buildSuggestion(
  item: IngestedItem,
  entry: DiscountCatalogEntry,
): DiscountSuggestion | null {
  if (entry.discountUnitPrice >= entry.referenceUnitPrice) return null;

  const referenceLineTotal = Number(
    (entry.referenceUnitPrice * item.quantity).toFixed(2),
  );
  const discountLineTotal = Number(
    (entry.discountUnitPrice * item.quantity).toFixed(2),
  );
  const savingsAmount = Number(
    (referenceLineTotal - discountLineTotal).toFixed(2),
  );
  if (savingsAmount <= 0) return null;

  return {
    itemId: item.id,
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    referenceStore: entry.referenceStoreLabel,
    referenceUnitPrice: entry.referenceUnitPrice,
    referenceLineTotal,
    discountStore: entry.store,
    discountProductName: entry.discountLabel,
    discountUnitPrice: entry.discountUnitPrice,
    discountLineTotal,
    savingsAmount,
    catalogEntryId: entry.id,
  };
}

export function getDiscountSuggestions(items: IngestedItem[]): DiscountSuggestionsSummary {
  const suggestions: DiscountSuggestion[] = [];

  for (const item of items) {
    const entry = findCatalogMatch(item);
    if (!entry) {
      const appliedEntry = findDiscountEntryForItem(item);
      if (!appliedEntry) continue;
      const suggestion = buildSuggestion(
        { ...item, name: appliedEntry.referenceLabel },
        appliedEntry,
      );
      if (suggestion) {
        suggestions.push({
          ...suggestion,
          itemId: item.id,
          itemName: `${appliedEntry.referenceLabel} → ${appliedEntry.discountLabel}`,
        });
      }
      continue;
    }
    if (normalize(item.name) === normalize(entry.discountLabel)) {
      const suggestion = buildSuggestion(
        { ...item, name: entry.referenceLabel },
        entry,
      );
      if (suggestion) {
        suggestions.push({
          ...suggestion,
          itemId: item.id,
          itemName: `${entry.referenceLabel} → ${entry.discountLabel}`,
        });
      }
      continue;
    }
    const suggestion = buildSuggestion(item, entry);
    if (suggestion) suggestions.push(suggestion);
  }

  suggestions.sort((a, b) => b.savingsAmount - a.savingsAmount);
  const totalPotentialSavings = Number(
    suggestions.reduce((s, x) => s + x.savingsAmount, 0).toFixed(2),
  );

  return {
    suggestions,
    totalPotentialSavings,
    replaceableCount: suggestions.length,
  };
}

export function applySuggestionToItem(
  item: IngestedItem,
  suggestion: DiscountSuggestion,
): IngestedItem {
  return {
    ...item,
    name: suggestion.discountProductName,
    category:
      DISCOUNT_PGC_CATALOG.find((e) => e.id === suggestion.catalogEntryId)?.category ??
      item.category,
  };
}

export function estimateTripCostEuro(roundTripKm: number): number {
  return Number((roundTripKm * DISCOUNT_TRIP_COST_PER_KM).toFixed(2));
}

/** Économie produit nette après coût trajet marginal pour un arrêt discount. */
export function isDiscountStopWorthwhile(
  productSavingsEuro: number,
  roundTripKm: number,
): boolean {
  return productSavingsEuro > estimateTripCostEuro(roundTripKm);
}

export function discountPartnerId(store: DiscountStoreId): "lidl" | "aldi" {
  return store;
}

export function lineTotalAtDiscountStore(
  item: IngestedItem,
  entry: DiscountCatalogEntry,
): number {
  return Number((entry.discountUnitPrice * item.quantity).toFixed(2));
}
