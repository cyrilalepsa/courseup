import type {
  GamificationBadgeId,
  GamificationBadgeRecord,
  GamificationEvaluationInput,
} from "@/types/gamification";

export interface BadgeDefinition {
  id: GamificationBadgeId;
  label: string;
  description: string;
  cssClass: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "eco-shopper",
    label: "Éco-Acheteur",
    description: "Économies réelles cumulées sur vos parcours optimisés.",
    cssClass: "neria-badge-gamification-eco",
  },
  {
    id: "discount-hunter",
    label: "Chasseur Discount",
    description: "Au moins un stop discount Lidl/Aldi intégré au panier.",
    cssClass: "neria-badge-gamification-discount",
  },
  {
    id: "selys-artisan",
    label: "Soutien Artisans Selys",
    description: "Produits réservés auprès du réseau Selys Marketplace.",
    cssClass: "neria-badge-gamification-selys",
  },
  {
    id: "heritia-anti-waste",
    label: "Anti-Gaspillage Heritia",
    description: "Export frais synchronisé vers Heritia pour le suivi DLC.",
    cssClass: "neria-badge-gamification-heritia",
  },
];

const DEF_BY_ID = new Map(BADGE_DEFINITIONS.map((d) => [d.id, d]));

export function getBadgeDefinition(id: GamificationBadgeId): BadgeDefinition | undefined {
  return DEF_BY_ID.get(id);
}

export function evaluateBadgeUnlocks(input: GamificationEvaluationInput): GamificationBadgeId[] {
  const unlocked: GamificationBadgeId[] = [];
  if (input.totalSavingsEuro >= 6) unlocked.push("eco-shopper");
  if (input.hasDiscountStop) unlocked.push("discount-hunter");
  if (input.selysItemCount > 0) unlocked.push("selys-artisan");
  if (input.freshItemCount > 0 && input.heritiaExportQueued) {
    unlocked.push("heritia-anti-waste");
  }
  return unlocked;
}

export function mergeBadgeRecords(
  current: GamificationBadgeRecord[],
  ids: GamificationBadgeId[],
): GamificationBadgeRecord[] {
  const map = new Map(current.map((b) => [b.id, b]));
  const now = new Date().toISOString();
  for (const id of ids) {
    if (!map.has(id)) map.set(id, { id, unlockedAt: now });
  }
  return [...map.values()].sort(
    (a, b) => Date.parse(a.unlockedAt) - Date.parse(b.unlockedAt),
  );
}

export function isBadgeUnlocked(
  records: GamificationBadgeRecord[],
  id: GamificationBadgeId,
): boolean {
  return records.some((r) => r.id === id);
}
