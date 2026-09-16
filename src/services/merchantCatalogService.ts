import { DEMO_SELYS_MERCHANTS } from "@/config/demoMerchants";
import { isDemoCockpitBarEnabled } from "@/config/demoCockpitFlags";
import { SELYS_MERCHANT_REWARDS } from "@/config/merchantRewards";
import type { CockpitDemoProfile } from "@/types/cockpitDemo";
import type { MerchantRewardOffer } from "@/types/rewards";

let demoMerchantsInjected = false;

export function injectDemoMerchantCatalog(force = false): void {
  if (!isDemoCockpitBarEnabled() && !force) return;
  demoMerchantsInjected = true;
}

export function isDemoMerchantCatalogActive(): boolean {
  return demoMerchantsInjected || isDemoCockpitBarEnabled();
}

export function getMerchantRewardCatalog(): MerchantRewardOffer[] {
  const demoRewards = DEMO_SELYS_MERCHANTS.flatMap((m) => m.rewards);
  if (!isDemoMerchantCatalogActive()) {
    return [...SELYS_MERCHANT_REWARDS];
  }
  const byId = new Map<string, MerchantRewardOffer>();
  for (const reward of SELYS_MERCHANT_REWARDS) byId.set(reward.id, reward);
  for (const reward of demoRewards) byId.set(reward.id, reward);
  return [...byId.values()];
}

export function getDemoMerchantProfiles() {
  return DEMO_SELYS_MERCHANTS;
}

export function effectiveRewardCost(
  reward: MerchantRewardOffer,
  profile: CockpitDemoProfile | null,
): number {
  if (!profile) return reward.n2oCost;
  if (profile.entitlements.complimentaryRedemptions) return 0;
  if (profile.entitlements.vipRewards) {
    return Math.max(1, Math.floor(reward.n2oCost * 0.5));
  }
  return reward.n2oCost;
}
