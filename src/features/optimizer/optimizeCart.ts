import type { IngestedItem, ItemCategory } from "@/types/ingestion";
import type {
  AssignedLineItem,
  N2OGain,
  OptimizationMode,
  OptimizedBasket,
  PartnerDrive,
  PartnerStoreId,
  StoreSplit,
} from "@/types/optimizer";
import {
  DEFAULT_DISCOUNT_TRIP_KM_ONE_WAY,
  findDiscountEntryForItem,
  isDiscountStopWorthwhile,
  lineTotalAtDiscountStore,
} from "@/services/discountService";
import { computeMultiDriveTripKm } from "@/services/locationService";
import type { DriveStore, StoreBrand } from "@/types/store";

export const PARTNER_DRIVES: PartnerDrive[] = [
  {
    id: "carrefour",
    name: "Carrefour Drive",
    type: "drive",
    affiliationRate: 0.05,
    priceIndex: 1.02,
    pickupMinutes: 35,
    accentClass: "from-blue-600/25 to-blue-400/10",
  },
  {
    id: "leclerc",
    name: "Leclerc Drive",
    type: "drive",
    affiliationRate: 0.03,
    priceIndex: 0.94,
    pickupMinutes: 40,
    accentClass: "from-sky-500/20 to-cyan-400/10",
  },
  {
    id: "auchan",
    name: "Auchan Drive",
    type: "drive",
    affiliationRate: 0.07,
    priceIndex: 0.98,
    pickupMinutes: 38,
    accentClass: "from-red-500/20 to-orange-400/10",
  },
  {
    id: "lidl",
    name: "Lidl",
    type: "drive",
    affiliationRate: 0.02,
    priceIndex: 0.88,
    pickupMinutes: 28,
    accentClass: "from-yellow-500/30 to-blue-800/20",
  },
  {
    id: "aldi",
    name: "Aldi",
    type: "drive",
    affiliationRate: 0.025,
    priceIndex: 0.86,
    pickupMinutes: 26,
    accentClass: "from-sky-700/25 to-orange-500/15",
  },
  {
    id: "selys-local",
    name: "Selys — Artisans locaux",
    type: "local",
    affiliationRate: 0.06,
    priceIndex: 1.08,
    pickupMinutes: 25,
    accentClass: "from-emerald-500/25 to-lime-400/10",
  },
];

const DRIVES = PARTNER_DRIVES.filter(
  (s) => s.type === "drive" && s.id !== "lidl" && s.id !== "aldi",
);
const DISCOUNT_DRIVES = PARTNER_DRIVES.filter((s) => s.id === "lidl" || s.id === "aldi");
const SELYS = PARTNER_DRIVES.find((s) => s.id === "selys-local")!;

export interface OptimizeCartOptions {
  selectedStores?: Partial<Record<StoreBrand, DriveStore>>;
  /** Articles pour lesquels l'utilisateur a accepté l'équivalent discount. */
  discountAppliedItemIds?: string[];
  /** Somme des économies € liées aux remplacements discount (bonus N2O). */
  discountSavingsTotal?: number;
}

function partnerBrand(partnerId: PartnerStoreId): StoreBrand | null {
  switch (partnerId) {
    case "carrefour":
      return "carrefour";
    case "leclerc":
      return "leclerc";
    case "auchan":
      return "auchan";
    case "lidl":
    case "aldi":
      return null;
    case "selys-local":
      return "selys";
    default:
      return null;
  }
}

function discountDriveById(id: PartnerStoreId): PartnerDrive | undefined {
  return DISCOUNT_DRIVES.find((d) => d.id === id);
}

function appliedDiscountIds(options?: OptimizeCartOptions): Set<string> {
  return new Set(options?.discountAppliedItemIds ?? []);
}

function discountLineForItem(
  item: IngestedItem,
  options?: OptimizeCartOptions,
): { store: PartnerDrive; line: AssignedLineItem } | null {
  const entry = findDiscountEntryForItem(item);
  if (!entry) return null;

  const applied = appliedDiscountIds(options);
  const nameMatchesDiscount =
    item.name.toLowerCase().trim() === entry.discountLabel.toLowerCase().trim();
  if (!applied.has(item.id) && !nameMatchesDiscount) return null;

  const store = discountDriveById(entry.store);
  if (!store) return null;

  const unitPrice = entry.discountUnitPrice;
  const lineTotal = lineTotalAtDiscountStore(item, entry);
  return {
    store,
    line: {
      itemId: item.id,
      name: entry.discountLabel,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice,
      lineTotal,
    },
  };
}

function cheapestClassicLine(item: IngestedItem): {
  store: PartnerDrive;
  line: AssignedLineItem;
} {
  let bestLine = lineForStore(item, DRIVES[0]);
  let bestStore = DRIVES[0];
  for (const store of DRIVES) {
    const line = lineForStore(item, store);
    if (line.lineTotal < bestLine.lineTotal) {
      bestLine = line;
      bestStore = store;
    }
  }
  return { store: bestStore, line: bestLine };
}

function mergeSplitIntoTarget(target: StoreSplit, donor: StoreSplit): void {
  target.items.push(...donor.items);
  target.subtotal = Number((target.subtotal + donor.subtotal).toFixed(2));
  target.affiliationCashback = Number(
    (target.subtotal * target.store.affiliationRate).toFixed(2),
  );
}

function pruneUnworthyDiscountStops(
  splits: StoreSplit[],
  items: IngestedItem[],
): StoreSplit[] {
  const itemById = new Map(items.map((i) => [i.id, i]));
  const next = [...splits];
  const discountIds = new Set<PartnerStoreId>(["lidl", "aldi"]);

  for (const discountId of discountIds) {
    const idx = next.findIndex((s) => s.store.id === discountId);
    if (idx < 0) continue;

    const split = next[idx];
    let productSavings = 0;
    for (const line of split.items) {
      const item =
        itemById.get(line.itemId) ??
        ({
          id: line.itemId,
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
          category: "épicerie",
          confidenceScore: 1,
          source: "text",
        } satisfies IngestedItem);
      const entry = findDiscountEntryForItem(item);
      if (!entry) continue;
      const classic = cheapestClassicLine(item);
      productSavings += classic.line.lineTotal - line.lineTotal;
    }
    productSavings = Number(productSavings.toFixed(2));

    const roundTrip =
      (split.tripDistanceKm ?? DEFAULT_DISCOUNT_TRIP_KM_ONE_WAY) * 2;

    if (!isDiscountStopWorthwhile(productSavings, roundTrip)) {
      const fallback =
        next.find((s) => DRIVES.some((d) => d.id === s.store.id)) ?? next[0];
      if (fallback && fallback !== split) {
        mergeSplitIntoTarget(fallback, split);
        next.splice(idx, 1);
      }
    }
  }

  return next;
}

function enrichSplits(
  splits: StoreSplit[],
  options?: OptimizeCartOptions,
): StoreSplit[] {
  return splits.map((split) => {
    if (split.store.id === "lidl" || split.store.id === "aldi") {
      return {
        ...split,
        displayName: split.store.name,
        tripDistanceKm: split.tripDistanceKm ?? DEFAULT_DISCOUNT_TRIP_KM_ONE_WAY,
      };
    }

    if (!options?.selectedStores) return split;
    const brand = partnerBrand(split.store.id);
    const physical = brand ? options.selectedStores?.[brand] : undefined;
    if (!physical) return split;
    return {
      ...split,
      physicalStore: physical,
      displayName: physical.name,
      tripDistanceKm: physical.distanceKm,
    };
  });
}

const CATEGORY_BASE: Record<ItemCategory, number> = {
  frais: 3.2,
  épicerie: 2.4,
  boissons: 1.8,
  autre: 2.1,
};

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function estimateUnitPrice(item: IngestedItem): number {
  const base = CATEGORY_BASE[item.category];
  const variance = (hashSeed(item.name) % 90) / 100;
  const qtyFactor = Math.min(item.quantity, 5) * 0.04;
  return Number((base + variance + qtyFactor).toFixed(2));
}

function lineForStore(item: IngestedItem, store: PartnerDrive): AssignedLineItem {
  const unitPrice = Number(
    (estimateUnitPrice(item) * store.priceIndex).toFixed(2),
  );
  const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
  return {
    itemId: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice,
    lineTotal,
  };
}

function buildSplit(store: PartnerDrive, lines: AssignedLineItem[]): StoreSplit {
  const subtotal = Number(lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
  const affiliationCashback = Number((subtotal * store.affiliationRate).toFixed(2));
  return { store, items: lines, subtotal, affiliationCashback };
}

function baselineTotal(items: IngestedItem[]): number {
  return Number(
    items
      .reduce((sum, item) => {
        const ref = Math.max(...DRIVES.map((d) => lineForStore(item, d).lineTotal));
        return sum + ref;
      }, 0)
      .toFixed(2),
  );
}

function computeN2O(
  mode: OptimizationMode,
  optimizedTotal: number,
  splits: StoreSplit[],
  discountSavingsTotal = 0,
): N2OGain {
  const affiliationSum = splits.reduce((s, sp) => s + sp.affiliationCashback, 0);
  const modeBonus =
    mode === "monopoly" ? 40 : mode === "multi-drive" ? 120 : 95;
  const discountBonus = Math.round(discountSavingsTotal * 6);
  const pointsEarned = Math.round(
    optimizedTotal * 3.2 + affiliationSum * 45 + modeBonus + discountBonus,
  );
  const conversionProgress = Math.min(1, pointsEarned / 600);
  const tierLabel =
    conversionProgress >= 0.85
      ? "Platinum Dispatch"
      : conversionProgress >= 0.55
        ? "Gold Panier"
        : conversionProgress >= 0.3
          ? "Silver Match"
          : "Bronze N2O";
  return {
    pointsEarned,
    conversionProgress,
    tierLabel,
    cashbackEuro: Number(affiliationSum.toFixed(2)),
    bonusLabel:
      discountSavingsTotal > 0
        ? `Bonus discount PGC (+${discountBonus} N2O · ${discountSavingsTotal.toFixed(2)} € économisés)`
        : mode === "multi-drive"
          ? "Bonus split multi-enseignes"
          : mode === "hybrid-selys"
            ? "Bonus circuit court Selys"
            : "Bonus monopole express",
  };
}

function summarize(
  mode: OptimizationMode,
  splits: StoreSplit[],
  items: IngestedItem[],
  timeScoreLabel: string,
  options?: OptimizeCartOptions,
): OptimizedBasket {
  const optimizedTotal = Number(
    splits.reduce((s, sp) => s + sp.subtotal, 0).toFixed(2),
  );
  const base = baselineTotal(items);
  const savingsAmount = Number(Math.max(0, base - optimizedTotal).toFixed(2));
  const rawPercent = base > 0 ? (savingsAmount / base) * 100 : 0;
  const savingsPercent =
    mode === "multi-drive"
      ? Number(Math.min(25, Math.max(rawPercent, savingsAmount > 0 ? 12 : 0)).toFixed(1))
      : Number(rawPercent.toFixed(1));

  const n2o = computeN2O(
    mode,
    optimizedTotal,
    splits,
    options?.discountSavingsTotal ?? 0,
  );
  const totalTripDistanceKm = computeMultiDriveTripKm(splits);

  return {
    mode,
    splits,
    itemCount: items.length,
    savings: {
      baselineTotal: base,
      optimizedTotal,
      savingsAmount,
      savingsPercent,
      storeCount: splits.length,
      estimatedTrips: splits.length,
      timeScoreLabel,
      totalTripDistanceKm,
    },
    n2o,
  };
}

function finalizeBasket(
  mode: OptimizationMode,
  splits: StoreSplit[],
  items: IngestedItem[],
  timeScoreLabel: string,
  options?: OptimizeCartOptions,
): OptimizedBasket {
  const enriched = enrichSplits(splits, options);
  const pruned = pruneUnworthyDiscountStops(enriched, items);
  const tripKm = computeMultiDriveTripKm(pruned);
  const label =
    tripKm > 0
      ? `${timeScoreLabel} · ~${tripKm} km trajets`
      : timeScoreLabel;
  return summarize(mode, pruned, items, label, options);
}

function optimizeMonopoly(
  items: IngestedItem[],
  options?: OptimizeCartOptions,
): OptimizedBasket {
  let bestStore = DRIVES[0];
  let bestTotal = Infinity;

  for (const store of DRIVES) {
    const total = items.reduce(
      (s, item) => s + lineForStore(item, store).lineTotal,
      0,
    );
    if (total < bestTotal) {
      bestTotal = total;
      bestStore = store;
    }
  }

  const lines = items.map((item) => lineForStore(item, bestStore));
  return finalizeBasket(
    "monopoly",
    [buildSplit(bestStore, lines)],
    items,
    "1 trajet · gain temps max",
    options,
  );
}

function optimizeMultiDrive(
  items: IngestedItem[],
  options?: OptimizeCartOptions,
): OptimizedBasket {
  const byStore = new Map<PartnerStoreId, AssignedLineItem[]>();

  for (const item of items) {
    const discountAssignment = discountLineForItem(item, options);
    if (discountAssignment) {
      const bucket = byStore.get(discountAssignment.store.id) ?? [];
      bucket.push(discountAssignment.line);
      byStore.set(discountAssignment.store.id, bucket);
      continue;
    }

    let bestLine = lineForStore(item, DRIVES[0]);
    let bestStore = DRIVES[0];

    for (const store of DRIVES) {
      const line = lineForStore(item, store);
      if (line.lineTotal < bestLine.lineTotal) {
        bestLine = line;
        bestStore = store;
      }
    }

    const bucket = byStore.get(bestStore.id) ?? [];
    bucket.push(bestLine);
    byStore.set(bestStore.id, bucket);
  }

  let splits = [...byStore.entries()].map(([id, lines]) => {
    const store = PARTNER_DRIVES.find((s) => s.id === id)!;
    return buildSplit(store, lines);
  });

  splits.sort((a, b) => b.subtotal - a.subtotal);

  if (splits.length > 3) {
    const keep = splits.slice(0, 3);
    const merge = splits.slice(3);
    const target = keep[keep.length - 1];
    for (const sp of merge) {
      target.items.push(...sp.items);
      target.subtotal = Number(
        (target.subtotal + sp.subtotal).toFixed(2),
      );
      target.affiliationCashback = Number(
        (target.subtotal * target.store.affiliationRate).toFixed(2),
      );
    }
    splits = keep;
  }

  return finalizeBasket(
    "multi-drive",
    splits,
    items,
    `${splits.length} drives · économie max`,
    options,
  );
}

function optimizeHybridSelys(
  items: IngestedItem[],
  options?: OptimizeCartOptions,
): OptimizedBasket {
  const selysItems: AssignedLineItem[] = [];
  const remaining: IngestedItem[] = [];

  for (const item of items) {
    if (item.category === "frais" || hashSeed(item.name) % 3 === 0) {
      selysItems.push(lineForStore(item, SELYS));
    } else {
      remaining.push(item);
    }
  }

  const driveBuckets = new Map<PartnerStoreId, AssignedLineItem[]>();

  for (const item of remaining) {
    const discountAssignment = discountLineForItem(item, options);
    if (discountAssignment) {
      const bucket = driveBuckets.get(discountAssignment.store.id) ?? [];
      bucket.push(discountAssignment.line);
      driveBuckets.set(discountAssignment.store.id, bucket);
      continue;
    }

    let best = lineForStore(item, DRIVES[0]);
    let bestStore = DRIVES[0];
    for (const store of DRIVES) {
      const line = lineForStore(item, store);
      if (line.lineTotal < best.lineTotal) {
        best = line;
        bestStore = store;
      }
    }
    const bucket = driveBuckets.get(bestStore.id) ?? [];
    bucket.push(best);
    driveBuckets.set(bestStore.id, bucket);
  }

  const splits: StoreSplit[] = [];
  if (selysItems.length) {
    splits.push(buildSplit(SELYS, selysItems));
  }
  for (const [id, lines] of driveBuckets) {
    const store = PARTNER_DRIVES.find((s) => s.id === id)!;
    splits.push(buildSplit(store, lines));
  }

  return finalizeBasket(
    "hybrid-selys",
    splits,
    items,
    "Circuits courts prioritaires",
    options,
  );
}

export function optimizeCart(
  items: IngestedItem[],
  mode: OptimizationMode,
  options?: OptimizeCartOptions,
): OptimizedBasket {
  if (items.length === 0) {
    return summarize(mode, [], items, "—", options);
  }

  switch (mode) {
    case "monopoly":
      return optimizeMonopoly(items, options);
    case "multi-drive":
      return optimizeMultiDrive(items, options);
    case "hybrid-selys":
      return optimizeHybridSelys(items, options);
    default:
      return optimizeMonopoly(items, options);
  }
}

export const MODE_META: Record<
  OptimizationMode,
  { title: string; subtitle: string; highlight: string }
> = {
  monopoly: {
    title: "Plein Monopole",
    subtitle: "1 seul Drive — gain de temps maximum",
    highlight: "Coût standard · 1 trajet",
  },
  "multi-drive": {
    title: "Split Multi-Drives",
    subtitle: "2 à 3 enseignes — économie maximale",
    highlight: "Jusqu'à −25 % vs panier de référence",
  },
  "hybrid-selys": {
    title: "Hybride Selys",
    subtitle: "Artisans locaux + drives partenaires",
    highlight: "Circuits courts prioritaires",
  },
};
