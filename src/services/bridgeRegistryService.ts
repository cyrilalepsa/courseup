import type {
  BridgeRegistryListener,
  CockpitBridgeManifest,
  NeriaBridgeDefinition,
} from "@/types/bridge";
import type { NotificationPreferences } from "@/types/notifications";

export const COCKPIT_BRIDGE_MESSAGE = "NERIACORP_BRIDGE_MANIFEST";
export const COCKPIT_BRIDGE_EVENT = "neriacorp:cockpit-bridge-update";

const COCKPIT_ORIGINS = [
  "https://cockpit.neriacorp.io",
  "https://app.neriacorp.io",
];

const BUILTIN_BRIDGES: NeriaBridgeDefinition[] = [
  {
    id: "heritia",
    appName: "Heritia",
    title: "Planning Repas",
    subtitle: "Importer le menu de la semaine",
    detail: "12 ingrédients extraits de 5 recettes",
    exportTitle: "Frigo Heritia",
    exportDetail: "Produits frais → suivi DLC & recettes anti-gaspillage",
    accentClass: "from-rose-100 to-orange-50",
    directions: ["import", "export"],
    importEndpoint: "https://app.neriacorp.io/heritia/export",
    exportEndpoint: "https://app.neriacorp.io/heritia/import",
    enabled: true,
    source: "builtin",
    version: "1.0.0",
  },
  {
    id: "mamandouce",
    appName: "MamanDouce",
    title: "Gestion Foyer",
    subtitle: "Importer la liste de courses partagée",
    detail: "8 produits de la maison",
    exportTitle: "Liste familiale",
    exportDetail: "Sync cagnotte & programme courses partagées",
    accentClass: "from-violet-100 to-cyan-50",
    directions: ["import", "export"],
    importEndpoint: "https://app.neriacorp.io/mamandouce/export",
    exportEndpoint: "https://app.neriacorp.io/mamandouce/sync",
    enabled: true,
    source: "builtin",
    version: "1.0.0",
  },
];

const STORAGE_KEY = "courseup:bridge-registry:v1";

let activeBridges: NeriaBridgeDefinition[] = [...BUILTIN_BRIDGES];
const listeners = new Set<BridgeRegistryListener>();
let cockpitNotificationPatch: Partial<NotificationPreferences> | null = null;
let messageBound = false;

function isAllowedOrigin(origin: string): boolean {
  if (import.meta.env.DEV) return true;
  return COCKPIT_ORIGINS.some((allowed) => origin.startsWith(allowed));
}

function notifyListeners(): void {
  const snapshot = getActiveBridges();
  for (const listener of listeners) listener(snapshot);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COCKPIT_BRIDGE_EVENT, {
        detail: { bridges: snapshot, notificationDefaults: cockpitNotificationPatch },
      }),
    );
  }
}

function mergeBridge(
  base: NeriaBridgeDefinition,
  patch: Partial<NeriaBridgeDefinition>,
): NeriaBridgeDefinition {
  return {
    ...base,
    ...patch,
    id: base.id,
    directions: patch.directions ?? base.directions,
    source: patch.source ?? "cockpit",
  };
}

function persistRegistry(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bridges: activeBridges,
        notificationDefaults: cockpitNotificationPatch,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

function loadPersistedRegistry(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      bridges?: NeriaBridgeDefinition[];
      notificationDefaults?: Partial<NotificationPreferences>;
    };
    if (Array.isArray(parsed.bridges) && parsed.bridges.length > 0) {
      activeBridges = parsed.bridges;
    }
    cockpitNotificationPatch = parsed.notificationDefaults ?? null;
  } catch {
    /* ignore corrupt cache */
  }
}

export function getActiveBridges(): NeriaBridgeDefinition[] {
  return activeBridges.filter((bridge) => bridge.enabled);
}

export function getBridgeById(id: string): NeriaBridgeDefinition | undefined {
  return activeBridges.find((bridge) => bridge.id === id && bridge.enabled);
}

export function registerBridge(definition: NeriaBridgeDefinition): void {
  const index = activeBridges.findIndex((b) => b.id === definition.id);
  if (index >= 0) {
    activeBridges[index] = definition;
  } else {
    activeBridges.push(definition);
  }
  persistRegistry();
  notifyListeners();
}

export function applyCockpitManifest(manifest: CockpitBridgeManifest): void {
  const byId = new Map(activeBridges.map((b) => [b.id, b]));

  for (const patch of manifest.bridges) {
    const existing = byId.get(patch.id) ?? BUILTIN_BRIDGES.find((b) => b.id === patch.id);
    if (!existing) {
      if (patch.appName && patch.title) {
        registerBridge({
          id: patch.id,
          appName: patch.appName,
          title: patch.title,
          subtitle: patch.subtitle ?? "Pont NeriaCorp",
          detail: patch.detail ?? "Synchronisation inter-apps",
          exportTitle: patch.exportTitle ?? patch.title,
          exportDetail: patch.exportDetail ?? patch.subtitle ?? "",
          accentClass: patch.accentClass ?? "from-cyan-100 to-blue-50",
          directions: patch.directions ?? ["bidirectional"],
          importEndpoint: patch.importEndpoint ?? "",
          exportEndpoint: patch.exportEndpoint ?? "",
          enabled: patch.enabled ?? true,
          source: "cockpit",
          version: patch.version ?? String(manifest.version),
        });
      }
      continue;
    }
    registerBridge(mergeBridge(existing, patch));
  }

  if (manifest.notificationDefaults) {
    cockpitNotificationPatch = manifest.notificationDefaults;
  }

  persistRegistry();
  notifyListeners();
}

export function getCockpitNotificationDefaults(): Partial<NotificationPreferences> | null {
  return cockpitNotificationPatch;
}

export function subscribeBridgeRegistry(listener: BridgeRegistryListener): () => void {
  listeners.add(listener);
  listener(getActiveBridges());
  return () => listeners.delete(listener);
}

function handleWindowMessage(event: MessageEvent): void {
  const data = event.data as { type?: string; payload?: CockpitBridgeManifest };
  if (!data || data.type !== COCKPIT_BRIDGE_MESSAGE || !data.payload) return;
  if (!isAllowedOrigin(event.origin)) return;
  if (data.payload.schema !== "neriacorp.cockpit.bridges") return;
  applyCockpitManifest(data.payload);
}

/** Initialise l'écoute des manifests Cockpit NeriaCorp (postMessage + cache local). */
export function initializeBridgeRegistry(): () => void {
  loadPersistedRegistry();
  notifyListeners();

  if (typeof window === "undefined" || messageBound) {
    return () => {};
  }

  window.addEventListener("message", handleWindowMessage);
  messageBound = true;

  return () => {
    window.removeEventListener("message", handleWindowMessage);
    messageBound = false;
  };
}

/** Simulation locale pour tests Cockpit / agents. */
export function simulateCockpitManifest(manifest: CockpitBridgeManifest): void {
  applyCockpitManifest(manifest);
}

export function resetBridgeRegistryToDefaults(): void {
  activeBridges = [...BUILTIN_BRIDGES];
  cockpitNotificationPatch = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyListeners();
}
