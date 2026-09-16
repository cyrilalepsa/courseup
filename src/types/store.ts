export type StoreBrand =
  | "leclerc"
  | "carrefour"
  | "auchan"
  | "intermarche"
  | "selys";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface DriveStore {
  id: string;
  name: string;
  brand: StoreBrand;
  distanceKm: number;
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
  /** Rayon de geofencing (commerces Selys) en mètres */
  geofenceRadiusM?: number;
}

export type SearchRadiusKm = 5 | 10 | 20;

export interface LocationPreferences {
  searchRadiusKm: SearchRadiusKm;
  postalCode: string;
  city: string;
  coordinates: GeoCoordinates;
  locationSource: "gps" | "manual";
  selectedStoreIds: Partial<Record<StoreBrand, string>>;
}

export const DEFAULT_LOCATION_PREFS: LocationPreferences = {
  searchRadiusKm: 10,
  postalCode: "83160",
  city: "La Valette-du-Var",
  coordinates: { lat: 43.1378, lng: 6.0031 },
  locationSource: "manual",
  selectedStoreIds: {},
};
