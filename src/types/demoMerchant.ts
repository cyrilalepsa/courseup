import type { MerchantRewardOffer } from "@/types/rewards";

export interface DemoMerchantProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  rewards: MerchantRewardOffer[];
}
