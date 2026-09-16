import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  appendOrder,
  DEFAULT_N2O_BALANCE,
  loadPersistedState,
  saveCart,
  saveLocationPrefs,
  saveN2OBalance,
} from "@/services/storageService";
import {
  filterStoresInRadius,
  isInsideGeofence,
  pickDefaultSelections,
  requestUserGeolocation,
  resolveCoordinatesFromPostal,
  resolveSelectedStores,
  storesByBrand,
} from "@/services/locationService";
import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import { DEFAULT_LOCATION_PREFS } from "@/types/store";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";

interface CourseUpContextValue {
  isHydrated: boolean;
  items: IngestedItem[];
  n2oBalance: number;
  ordersHistory: DispatchOrder[];
  locationPrefs: LocationPreferences;
  nearbyStores: DriveStore[];
  selectedStores: Partial<Record<StoreBrand, DriveStore>>;
  selysGeofenceActive: boolean;
  isLocating: boolean;
  locationError: string | null;
  storeSelectorOpen: boolean;
  setStoreSelectorOpen: (open: boolean) => void;
  setItems: (items: IngestedItem[]) => void;
  addItem: (item?: Partial<IngestedItem> & Pick<IngestedItem, "name">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  addN2OBalance: (amount: number) => void;
  saveOrder: (order: DispatchOrder) => Promise<void>;
  setSearchRadius: (radius: SearchRadiusKm) => void;
  setManualLocation: (postalCode: string, city: string) => void;
  requestGpsLocation: () => Promise<void>;
  setSelectedStore: (brand: StoreBrand, storeId: string) => void;
}

const CourseUpContext = createContext<CourseUpContextValue | null>(null);

function withNearbyStores(prefs: LocationPreferences) {
  const nearby = filterStoresInRadius(prefs.coordinates, prefs.searchRadiusKm);
  const selectedStoreIds = pickDefaultSelections(storesByBrand(nearby), prefs.selectedStoreIds);
  const nextPrefs = { ...prefs, selectedStoreIds };
  return {
    prefs: nextPrefs,
    nearby,
    selected: resolveSelectedStores(nextPrefs, nearby),
  };
}

export function CourseUpProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [items, setItemsState] = useState<IngestedItem[]>([]);
  const [n2oBalance, setN2oBalance] = useState(DEFAULT_N2O_BALANCE);
  const [ordersHistory, setOrdersHistory] = useState<DispatchOrder[]>([]);
  const [locationPrefs, setLocationPrefs] = useState<LocationPreferences>(
    DEFAULT_LOCATION_PREFS,
  );
  const [nearbyStores, setNearbyStores] = useState<DriveStore[]>([]);
  const [selectedStores, setSelectedStores] = useState<
    Partial<Record<StoreBrand, DriveStore>>
  >({});
  const [liveCoordinates, setLiveCoordinates] = useState(
    DEFAULT_LOCATION_PREFS.coordinates,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [storeSelectorOpen, setStoreSelectorOpen] = useState(false);

  const persistLocation = useCallback((prefs: LocationPreferences) => {
    const computed = withNearbyStores(prefs);
    setLocationPrefs(computed.prefs);
    setNearbyStores(computed.nearby);
    setSelectedStores(computed.selected);
    void saveLocationPrefs(computed.prefs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadPersistedState().then((state) => {
      if (cancelled) return;
      setItemsState(state.cart);
      setN2oBalance(state.n2oBalance);
      setOrdersHistory(state.ordersHistory);
      const computed = withNearbyStores(state.locationPrefs);
      setLocationPrefs(computed.prefs);
      setNearbyStores(computed.nearby);
      setSelectedStores(computed.selected);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLiveCoordinates(locationPrefs.coordinates);
  }, [locationPrefs.coordinates]);

  useEffect(() => {
    if (!isHydrated || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveCoordinates({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isHydrated]);

  const selysGeofenceActive = useMemo(() => {
    const selysStore = selectedStores.selys;
    if (!selysStore?.geofenceRadiusM) return false;
    return isInsideGeofence(liveCoordinates, selysStore);
  }, [liveCoordinates, selectedStores.selys]);

  const setItems = useCallback((next: IngestedItem[]) => {
    setItemsState(next);
    void saveCart(next);
  }, []);

  const addItem = useCallback(
    (partial?: Partial<IngestedItem> & Pick<IngestedItem, "name">) => {
      setItemsState((prev) => {
        const next = [
          ...prev,
          createIngestedItem(
            partial ?? {
              name: "Nouvel article",
              quantity: 1,
              unit: "u",
              category: "épicerie",
              confidenceScore: 1,
            },
            "text",
          ),
        ];
        void saveCart(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItemsState((prev) => {
      const next = prev.filter((item) => item.id !== id);
      void saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItemsState([]);
    void saveCart([]);
  }, []);

  const addN2OBalance = useCallback((amount: number) => {
    if (amount <= 0) return;
    setN2oBalance((prev) => {
      const next = prev + amount;
      void saveN2OBalance(next);
      return next;
    });
  }, []);

  const saveOrder = useCallback(async (order: DispatchOrder) => {
    setOrdersHistory((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev].slice(0, 50);
    });
    await appendOrder(order);
  }, []);

  const setSearchRadius = useCallback(
    (radius: SearchRadiusKm) => {
      persistLocation({ ...locationPrefs, searchRadiusKm: radius });
    },
    [locationPrefs, persistLocation],
  );

  const setManualLocation = useCallback(
    (postalCode: string, city: string) => {
      setLocationError(null);
      const resolved = resolveCoordinatesFromPostal(postalCode, city);
      persistLocation({
        ...locationPrefs,
        postalCode: postalCode.trim() || locationPrefs.postalCode,
        city: resolved.city,
        coordinates: { lat: resolved.lat, lng: resolved.lng },
        locationSource: "manual",
      });
    },
    [locationPrefs, persistLocation],
  );

  const requestGpsLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await requestUserGeolocation();
      persistLocation({
        ...locationPrefs,
        coordinates: coords,
        locationSource: "gps",
      });
    } catch {
      setLocationError(
        "Géolocalisation refusée ou indisponible — utilisez le code postal.",
      );
    } finally {
      setIsLocating(false);
    }
  }, [locationPrefs, persistLocation]);

  const setSelectedStore = useCallback(
    (brand: StoreBrand, storeId: string) => {
      persistLocation({
        ...locationPrefs,
        selectedStoreIds: { ...locationPrefs.selectedStoreIds, [brand]: storeId },
      });
    },
    [locationPrefs, persistLocation],
  );

  const value = useMemo(
    () => ({
      isHydrated,
      items,
      n2oBalance,
      ordersHistory,
      locationPrefs,
      nearbyStores,
      selectedStores,
      selysGeofenceActive,
      isLocating,
      locationError,
      storeSelectorOpen,
      setStoreSelectorOpen,
      setItems,
      addItem,
      removeItem,
      clearCart,
      addN2OBalance,
      saveOrder,
      setSearchRadius,
      setManualLocation,
      requestGpsLocation,
      setSelectedStore,
    }),
    [
      isHydrated,
      items,
      n2oBalance,
      ordersHistory,
      locationPrefs,
      nearbyStores,
      selectedStores,
      selysGeofenceActive,
      isLocating,
      locationError,
      storeSelectorOpen,
      setItems,
      addItem,
      removeItem,
      clearCart,
      addN2OBalance,
      saveOrder,
      setSearchRadius,
      setManualLocation,
      requestGpsLocation,
      setSelectedStore,
    ],
  );

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy text-sm text-slate-400">
        Chargement des données locales…
      </div>
    );
  }

  return <CourseUpContext.Provider value={value}>{children}</CourseUpContext.Provider>;
}

export function useCourseUp(): CourseUpContextValue {
  const ctx = useContext(CourseUpContext);
  if (!ctx) {
    throw new Error("useCourseUp must be used within CourseUpProvider");
  }
  return ctx;
}
