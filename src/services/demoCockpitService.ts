import {
  COCKPIT_BRIDGE_MESSAGE,
  simulateCockpitManifest,
} from "@/services/bridgeRegistryService";
import { notifyProximityAlert } from "@/services/notificationService";
import { purgeAllCourseUpStorage } from "@/services/storageService";
import { enqueueSyncJob, flushSyncQueue } from "@/services/syncManager";
import { HERITIA_FRESH_EXPORT_EVENT } from "@/services/cashbackService";
import type { CockpitBridgeManifest } from "@/types/bridge";
import type {
  CockpitDemoProfile,
  CockpitDemoRole,
  CockpitEntitlements,
  CockpitRightsManifest,
} from "@/types/cockpitDemo";
import { injectDemoMerchantCatalog } from "@/services/merchantCatalogService";
import { purgeNeriaAuthStorage } from "@/services/neriaAuthService";

export const COCKPIT_RIGHTS_MESSAGE = "NERIACORP_COCKPIT_RIGHTS";
export const COCKPIT_DEMO_PROFILE_EVENT = "neriacorp:cockpit-demo-profile";

const DEMO_TENANT = "selys-recette-cockpit";

const ROLE_LABELS: Record<CockpitDemoRole, string> = {
  "super-admin": "Super Admin",
  vip: "VIP",
  complimentary: "Complimentary",
  standard: "Standard",
};

function entitlementsForRole(role: CockpitDemoRole): CockpitEntitlements {
  switch (role) {
    case "super-admin":
      return {
        premiumBridges: true,
        vipRewards: true,
        complimentaryRedemptions: true,
        advancedDispatch: true,
        demoTools: true,
      };
    case "vip":
      return {
        premiumBridges: true,
        vipRewards: true,
        complimentaryRedemptions: false,
        advancedDispatch: true,
        demoTools: false,
      };
    case "complimentary":
      return {
        premiumBridges: false,
        vipRewards: false,
        complimentaryRedemptions: true,
        advancedDispatch: false,
        demoTools: false,
      };
    default:
      return {
        premiumBridges: false,
        vipRewards: false,
        complimentaryRedemptions: false,
        advancedDispatch: false,
        demoTools: false,
      };
  }
}

export function buildRightsManifest(role: CockpitDemoRole): CockpitRightsManifest {
  return {
    schema: "neriacorp.cockpit.rights",
    version: 1,
    issuedAt: new Date().toISOString(),
    tenantId: DEMO_TENANT,
    role,
    entitlements: entitlementsForRole(role),
  };
}

export function buildDemoProfile(role: CockpitDemoRole): CockpitDemoProfile {
  const manifest = buildRightsManifest(role);
  return {
    role,
    label: ROLE_LABELS[role],
    entitlements: manifest.entitlements,
    manifest,
  };
}

function bridgeManifestForRole(role: CockpitDemoRole): CockpitBridgeManifest {
  const premium = role === "super-admin" || role === "vip";
  return {
    schema: "neriacorp.cockpit.bridges",
    version: 2,
    issuedAt: new Date().toISOString(),
    bridges: [
      {
        id: "heritia",
        enabled: true,
        detail: premium
          ? "Pont premium Cockpit — export frais & anti-gaspillage activé"
          : "Pont standard Heritia",
      },
      {
        id: "mamandouce",
        enabled: true,
        detail: premium ? "Sync familiale prioritaire VIP" : "Sync familiale standard",
      },
    ],
    notificationDefaults: {
      proximityAlerts: true,
      n2oTierAlerts: premium,
    },
  };
}

let activeProfile: CockpitDemoProfile = buildDemoProfile("standard");
const profileListeners = new Set<(profile: CockpitDemoProfile) => void>();

export function getActiveDemoProfile(): CockpitDemoProfile {
  return activeProfile;
}

export function subscribeDemoProfile(listener: (profile: CockpitDemoProfile) => void): () => void {
  profileListeners.add(listener);
  listener(activeProfile);
  return () => profileListeners.delete(listener);
}

function notifyProfile(profile: CockpitDemoProfile): void {
  activeProfile = profile;
  for (const listener of profileListeners) listener(profile);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COCKPIT_DEMO_PROFILE_EVENT, { detail: { profile } }),
    );
  }
}

/** Simule un postMessage Cockpit (droits + ponts) sans rechargement. */
export function injectCockpitPostMessage(role: CockpitDemoRole): void {
  const rights = buildRightsManifest(role);
  const bridges = bridgeManifestForRole(role);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: COCKPIT_RIGHTS_MESSAGE, payload: rights },
        origin: window.location.origin,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: COCKPIT_BRIDGE_MESSAGE, payload: bridges },
        origin: window.location.origin,
      }),
    );
  } else {
    applyRightsManifest(rights);
    simulateCockpitManifest(bridges);
  }
}

export function applyRightsManifest(manifest: CockpitRightsManifest): void {
  if (manifest.schema !== "neriacorp.cockpit.rights") return;
  const profile = buildDemoProfile(manifest.role);
  profile.manifest = manifest;
  profile.entitlements = manifest.entitlements;
  notifyProfile(profile);
  if (manifest.entitlements.vipRewards || manifest.role === "super-admin") {
    injectDemoMerchantCatalog(true);
  }
}

export function switchDemoRole(role: CockpitDemoRole): CockpitDemoProfile {
  injectCockpitPostMessage(role);
  return getActiveDemoProfile();
}

export async function simulateGeofenceUnder2km(): Promise<boolean> {
  return notifyProximityAlert("Selys Halles — recette Cockpit", 1.4, "selys");
}

export interface N2OSyncSimulationResult {
  queued: boolean;
  flushed: boolean;
}

export async function simulateN2OSync(
  onCredit?: (amount: number) => void,
): Promise<N2OSyncSimulationResult> {
  await enqueueSyncJob("heritia_fresh_export", {
    source: "demo-cockpit",
    simulatedAt: new Date().toISOString(),
  });
  await enqueueSyncJob("badge_snapshot", {
    source: "demo-cockpit",
    badges: ["eco-shopper"],
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HERITIA_FRESH_EXPORT_EVENT, {
        detail: { source: "demo-cockpit", items: [] },
      }),
    );
  }

  onCredit?.(12);

  const remaining = await flushSyncQueue(async () => true);
  return { queued: true, flushed: remaining.length === 0 };
}

export async function purgeDemoIndexedDb(): Promise<void> {
  purgeNeriaAuthStorage();
  await purgeAllCourseUpStorage();
}

function handleRightsMessage(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: CockpitRightsManifest };
  if (!data || data.type !== COCKPIT_RIGHTS_MESSAGE || !data.payload) return;
  applyRightsManifest(data.payload);
}

/** Écoute postMessage droits (recette Cockpit) en plus du registry ponts. */
export function initializeDemoCockpitSimulator(): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("message", handleRightsMessage);
  notifyProfile(buildDemoProfile("standard"));
  return () => window.removeEventListener("message", handleRightsMessage);
}

export const DEMO_COCKPIT_ROLES: CockpitDemoRole[] = [
  "super-admin",
  "vip",
  "complimentary",
  "standard",
];
