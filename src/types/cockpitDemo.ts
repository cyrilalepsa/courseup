export type CockpitDemoRole = "super-admin" | "vip" | "complimentary" | "standard";

export interface CockpitEntitlements {
  premiumBridges: boolean;
  vipRewards: boolean;
  complimentaryRedemptions: boolean;
  advancedDispatch: boolean;
  demoTools: boolean;
}

export interface CockpitRightsManifest {
  schema: "neriacorp.cockpit.rights";
  version: number;
  issuedAt: string;
  tenantId: string;
  role: CockpitDemoRole;
  entitlements: CockpitEntitlements;
}

export interface CockpitDemoProfile {
  role: CockpitDemoRole;
  label: string;
  entitlements: CockpitEntitlements;
  manifest: CockpitRightsManifest;
}
