import type {
  DriveStore,
  GeoCoordinates,
  LocationPreferences,
  SearchRadiusKm,
  StoreBrand,
} from "@/types/store";

/** Points de référence pour le fallback code postal / ville */
const POSTAL_ANCHORS: Record<string, GeoCoordinates & { city: string }> = {
  "83160": { lat: 43.1378, lng: 6.0031, city: "La Valette-du-Var" },
  "83000": { lat: 43.1242, lng: 5.928, city: "Toulon" },
  "83130": { lat: 43.1247, lng: 6.0107, city: "La Garde" },
  "83400": { lat: 43.1203, lng: 6.1286, city: "Hyères" },
  "75001": { lat: 48.8606, lng: 2.3376, city: "Paris" },
};

const MOCK_STORE_CATALOG: Omit<DriveStore, "distanceKm">[] = [
  {
    id: "leclerc-valette",
    name: "E.Leclerc Drive La Valette-du-Var",
    brand: "leclerc",
    address: "117 av. du Maréchal Foch",
    postalCode: "83160",
    city: "La Valette-du-Var",
    lat: 43.1392,
    lng: 6.0018,
  },
  {
    id: "leclerc-toulon",
    name: "E.Leclerc Drive Toulon",
    brand: "leclerc",
    address: "ZAC Grand Var",
    postalCode: "83000",
    city: "Toulon",
    lat: 43.1289,
    lng: 5.9452,
  },
  {
    id: "carrefour-toulon",
    name: "Carrefour Drive Toulon",
    brand: "carrefour",
    address: "Bd des Arènes",
    postalCode: "83000",
    city: "Toulon",
    lat: 43.1211,
    lng: 5.9315,
  },
  {
    id: "carrefour-valette",
    name: "Carrefour Drive La Valette",
    brand: "carrefour",
    address: "Quartier Les Playes",
    postalCode: "83160",
    city: "La Valette-du-Var",
    lat: 43.1355,
    lng: 6.0089,
  },
  {
    id: "auchan-garde",
    name: "Auchan Drive La Garde",
    brand: "auchan",
    address: "RN 98",
    postalCode: "83130",
    city: "La Garde",
    lat: 43.1312,
    lng: 6.0178,
  },
  {
    id: "intermarche-hyeres",
    name: "Intermarché Drive Hyères",
    brand: "intermarche",
    address: "Av. de Badine",
    postalCode: "83400",
    city: "Hyères",
    lat: 43.1188,
    lng: 6.1321,
  },
  {
    id: "selys-toulon-halles",
    name: "Selys — Halles du Var",
    brand: "selys",
    address: "Place Louis Blanc",
    postalCode: "83000",
    city: "Toulon",
    lat: 43.1228,
    lng: 5.9341,
    geofenceRadiusM: 120,
  },
  {
    id: "selys-valette-artisans",
    name: "Selys — Marché des Artisans",
    brand: "selys",
    address: "Rue du Commerce",
    postalCode: "83160",
    city: "La Valette-du-Var",
    lat: 43.1369,
    lng: 6.0044,
    geofenceRadiusM: 150,
  },
  {
    id: "selys-garde-circuit",
    name: "Selys — Circuit Court La Garde",
    brand: "selys",
    address: "Allée des Producteurs",
    postalCode: "83130",
    city: "La Garde",
    lat: 43.1259,
    lng: 6.0122,
    geofenceRadiusM: 100,
  },
];

export function haversineKm(a: GeoCoordinates, b: GeoCoordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function resolveCoordinatesFromPostal(
  postalCode: string,
  city?: string,
): GeoCoordinates & { city: string } {
  const normalized = postalCode.trim();
  const anchor = POSTAL_ANCHORS[normalized];
  if (anchor) return anchor;
  const seed = normalized.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    lat: 43.12 + (seed % 100) / 1000,
    lng: 5.93 + (seed % 80) / 1000,
    city: city?.trim() || "France",
  };
}

export function requestUserGeolocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  });
}

export function attachDistances(
  origin: GeoCoordinates,
  stores: Omit<DriveStore, "distanceKm">[],
): DriveStore[] {
  return stores
    .map((store) => ({
      ...store,
      distanceKm: Number(
        haversineKm(origin, { lat: store.lat, lng: store.lng }).toFixed(1),
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function filterStoresInRadius(
  origin: GeoCoordinates,
  radiusKm: SearchRadiusKm,
): DriveStore[] {
  return attachDistances(origin, MOCK_STORE_CATALOG).filter(
    (s) => s.distanceKm <= radiusKm,
  );
}

export function storesByBrand(
  stores: DriveStore[],
): Record<StoreBrand, DriveStore[]> {
  const empty: Record<StoreBrand, DriveStore[]> = {
    leclerc: [],
    carrefour: [],
    auchan: [],
    intermarche: [],
    selys: [],
  };
  for (const store of stores) {
    empty[store.brand].push(store);
  }
  return empty;
}

export function pickDefaultSelections(
  grouped: Record<StoreBrand, DriveStore[]>,
  current: Partial<Record<StoreBrand, string>>,
): Partial<Record<StoreBrand, string>> {
  const next = { ...current };
  for (const brand of Object.keys(grouped) as StoreBrand[]) {
    const list = grouped[brand];
    if (!list.length) continue;
    if (!next[brand] || !list.some((s) => s.id === next[brand])) {
      next[brand] = list[0].id;
    }
  }
  return next;
}

export function getStoreById(storeId: string): DriveStore | undefined {
  const origin = POSTAL_ANCHORS["83160"];
  return attachDistances(origin, MOCK_STORE_CATALOG).find((s) => s.id === storeId);
}

export function resolveSelectedStores(
  prefs: LocationPreferences,
  nearby: DriveStore[],
): Partial<Record<StoreBrand, DriveStore>> {
  const byId = new Map(nearby.map((s) => [s.id, s]));
  const result: Partial<Record<StoreBrand, DriveStore>> = {};
  for (const brand of Object.keys(prefs.selectedStoreIds) as StoreBrand[]) {
    const id = prefs.selectedStoreIds[brand];
    if (!id) continue;
    const store = byId.get(id);
    if (store) result[brand] = store;
  }
  return result;
}

export function isInsideGeofence(
  user: GeoCoordinates,
  store: DriveStore,
): boolean {
  if (!store.geofenceRadiusM) return false;
  const km = haversineKm(user, { lat: store.lat, lng: store.lng });
  return km * 1000 <= store.geofenceRadiusM;
}

export function computeMultiDriveTripKm(
  splits: { tripDistanceKm?: number; physicalStore?: DriveStore }[],
): number {
  const seen = new Set<string>();
  let total = 0;
  for (const split of splits) {
    const id = split.physicalStore?.id ?? "unknown";
    if (seen.has(id)) continue;
    seen.add(id);
    const oneWay = split.tripDistanceKm ?? split.physicalStore?.distanceKm ?? 0;
    total += oneWay * 2;
  }
  return Number(total.toFixed(1));
}

export const DRIVE_BRANDS: StoreBrand[] = [
  "leclerc",
  "carrefour",
  "auchan",
  "intermarche",
  "selys",
];

export const BRAND_LABELS: Record<StoreBrand, string> = {
  leclerc: "Leclerc",
  carrefour: "Carrefour",
  auchan: "Auchan",
  intermarche: "Intermarché",
  selys: "Selys",
};
