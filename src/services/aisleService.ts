import type { MacroAisleDefinition, MacroAisleId, AisleGroup } from "@/types/aisle";
import { MACRO_AISLE_IDS } from "@/types/aisle";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizedBasket } from "@/types/optimizer";
import { loadAisleOrder, saveAisleOrder } from "@/services/storageService";

export const UNIVERSAL_MACRO_AISLES: MacroAisleDefinition[] = [
  { id: "fruits-legumes", label: "Fruits & Légumes", defaultOrder: 0 },
  { id: "boulangerie", label: "Boulangerie", defaultOrder: 1 },
  { id: "frais-cremerie", label: "Frais & Crémerie", defaultOrder: 2 },
  { id: "boucherie-poissonnerie", label: "Boucherie / Poissonnerie", defaultOrder: 3 },
  { id: "epicerie-salee", label: "Épicerie Salée", defaultOrder: 4 },
  { id: "epicerie-sucree", label: "Épicerie Sucrée", defaultOrder: 5 },
  { id: "boissons", label: "Boissons", defaultOrder: 6 },
  { id: "hygiene-entretien", label: "Hygiène & Entretien", defaultOrder: 7 },
];

const AISLE_BY_ID = new Map(UNIVERSAL_MACRO_AISLES.map((a) => [a.id, a]));

const STORE_AISLE_OVERRIDES: Record<string, Partial<Record<MacroAisleId, MacroAisleId>>> = {
  lidl: {
    "epicerie-sucree": "epicerie-salee",
  },
  aldi: {
    boulangerie: "frais-cremerie",
  },
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function resolveMacroAisle(item: IngestedItem): MacroAisleId {
  const name = normalize(item.name);

  if (/(tomate|oignon|pomme|poire|courgette|salade|banane|fruit|legume|epinard|carotte)/.test(name)) {
    return "fruits-legumes";
  }
  if (/(pain|baguette|brioche|viennoiserie|croissant)/.test(name)) return "boulangerie";
  if (/(lait|yaourt|fromage|beurre|creme|oeuf)/.test(name)) return "frais-cremerie";
  if (/(poulet|boeuf|porc|saumon|poisson|jambon|steak|filet)/.test(name)) {
    return "boucherie-poissonnerie";
  }
  if (/(pate|riz|huile|conserve|sel|epice|semoule|couscous|sauce tomate)/.test(name)) {
    return "epicerie-salee";
  }
  if (/(biscuit|chocolat|gateau|confiture|miel|sucre|bonbon|cereale)/.test(name)) {
    return "epicerie-sucree";
  }
  if (/(eau|jus|soda|biere|vin|cafe|the|boisson)/.test(name) || item.category === "boissons") {
    return "boissons";
  }
  if (/(shampoing|lessive|papier|dentifrice|savon|entretien|hygiene)/.test(name)) {
    return "hygiene-entretien";
  }

  switch (item.category) {
    case "frais":
      return "frais-cremerie";
    case "boissons":
      return "boissons";
    case "autre":
      return "hygiene-entretien";
    default:
      return "epicerie-salee";
  }
}

export function mapAisleForStore(aisleId: MacroAisleId, storeId: string): MacroAisleId {
  const overrides = STORE_AISLE_OVERRIDES[storeId];
  return overrides?.[aisleId] ?? aisleId;
}

export function defaultAisleOrder(): MacroAisleId[] {
  return [...MACRO_AISLE_IDS];
}

export async function getAisleOrderForStore(storeId: string): Promise<MacroAisleId[]> {
  const saved = await loadAisleOrder(storeId);
  if (saved?.length) {
    const valid = saved.filter((id) => MACRO_AISLE_IDS.includes(id));
    const missing = MACRO_AISLE_IDS.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  }
  return defaultAisleOrder();
}

export async function persistAisleOrderForStore(
  storeId: string,
  order: MacroAisleId[],
): Promise<void> {
  await saveAisleOrder(storeId, order);
}

export function groupItemsByAisle(
  items: IngestedItem[],
  storeId: string,
  aisleOrder: MacroAisleId[],
): AisleGroup[] {
  const buckets = new Map<MacroAisleId, IngestedItem[]>();

  for (const item of items) {
    const raw = resolveMacroAisle(item);
    const aisleId = mapAisleForStore(raw, storeId);
    const list = buckets.get(aisleId) ?? [];
    list.push(item);
    buckets.set(aisleId, list);
  }

  return aisleOrder
    .filter((aisleId) => (buckets.get(aisleId)?.length ?? 0) > 0)
    .map((aisleId) => ({
      aisleId,
      label: AISLE_BY_ID.get(aisleId)?.label ?? aisleId,
      items: buckets.get(aisleId) ?? [],
    }));
}

export function resolveInStoreShoppingStoreId(basket: OptimizedBasket): string {
  const primary = [...basket.splits].sort((a, b) => b.subtotal - a.subtotal)[0];
  return primary?.store.id ?? "leclerc";
}

export function moveAisleInOrder(
  order: MacroAisleId[],
  aisleId: MacroAisleId,
  direction: "up" | "down",
): MacroAisleId[] {
  const index = order.indexOf(aisleId);
  if (index < 0) return order;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
