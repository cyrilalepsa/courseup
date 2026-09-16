import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  saveNotificationPrefs,
} from "@/services/storageService";
import {
  collectProximityTargets,
  filterStoresInRadius,
  isInsideGeofence,
  isProximityCooldownActive,
  markProximityCooldown,
  pickDefaultSelections,
  requestUserGeolocation,
  resolveCoordinatesFromPostal,
  resolveSelectedStores,
  scanProximityAlert,
  startConfigurableLocationWatch,
  storesByBrand,
} from "@/services/locationService";
import {
  detectN2OTierUpgrade,
  getN2OTier,
  getNotificationPermission,
  notifyN2OTierUpgrade,
  notifyProximityAlert,
  requestNotificationPermission,
} from "@/services/notificationService";
import {
  COCKPIT_BRIDGE_EVENT,
  getCockpitNotificationDefaults,
} from "@/services/bridgeRegistryService";
import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
  type NotificationPermissionState,
} from "@/types/notifications";
import {
  DEFAULT_LOCATION_PREFS,
  type DriveStore,
  type LocationPreferences,
  type SearchRadiusKm,
  type StoreBrand,
} from "@/types/store";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";
import { ensureItemAttributesList } from "@/services/itemAttributeService";

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
  notificationPrefs: NotificationPreferences;
  notificationPermission: NotificationPermissionState;
  notificationSettingsOpen: boolean;
  setNotificationSettingsOpen: (open: boolean) => void;
  setNotificationPref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => void;
  refreshNotificationPermission: () => void;
  requestNotificationsAccess: () => Promise<NotificationPermissionState>;
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
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>(() => getNotificationPermission());
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const notificationPrefsRef = useRef(notificationPrefs);

  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
  }, [notificationPrefs]);

  useEffect(() => {
    const onCockpitConfig = (event: Event) => {
      const detail = (event as CustomEvent<{ notificationDefaults?: Partial<NotificationPreferences> }>)
        .detail;
      if (!detail?.notificationDefaults) return;
      setNotificationPrefsState((prev) => {
        const next = {
          ...prev,
          ...detail.notificationDefaults,
          proximityCooldown: {
            ...prev.proximityCooldown,
            ...(detail.notificationDefaults?.proximityCooldown ?? {}),
          },
        };
        void saveNotificationPrefs(next);
        return next;
      });
    };
    window.addEventListener(COCKPIT_BRIDGE_EVENT, onCockpitConfig);
    return () => window.removeEventListener(COCKPIT_BRIDGE_EVENT, onCockpitConfig);
  }, []);

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
      setItemsState(ensureItemAttributesList(state.cart));
      setN2oBalance(state.n2oBalance);
      setOrdersHistory(state.ordersHistory);
      const computed = withNearbyStores(state.locationPrefs);
      setLocationPrefs(computed.prefs);
      setNearbyStores(computed.nearby);
      setSelectedStores(computed.selected);
      const tierIndex = getN2OTier(state.n2oBalance).index;
      setNotificationPrefsState({
        ...state.notificationPrefs,
        lastTierIndex: Math.max(state.notificationPrefs.lastTierIndex, tierIndex),
      });
      setNotificationPermission(getNotificationPermission());
      const cockpitDefaults = getCockpitNotificationDefaults();
      if (cockpitDefaults) {
        setNotificationPrefsState((prev) => ({
          ...prev,
          ...cockpitDefaults,
          lastTierIndex: Math.max(
            prev.lastTierIndex,
            cockpitDefaults.lastTierIndex ?? prev.lastTierIndex,
          ),
          proximityCooldown: {
            ...prev.proximityCooldown,
            ...(cockpitDefaults.proximityCooldown ?? {}),
          },
        }));
      }
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return undefined;
    return startConfigurableLocationWatch(
      (coords) => setLiveCoordinates(coords),
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 },
    );
  }, [isHydrated]);

  const selysGeofenceActive = useMemo(() => {
    const selysStore = selectedStores.selys;
    if (!selysStore?.geofenceRadiusM) return false;
    const coords =
      locationPrefs.locationSource === "gps"
        ? liveCoordinates
        : locationPrefs.coordinates;
    return isInsideGeofence(coords, selysStore);
  }, [liveCoordinates, locationPrefs, selectedStores.selys]);

  useEffect(() => {
    if (!isHydrated || !notificationPrefs.proximityAlerts) return;
    if (getNotificationPermission() !== "granted") return;

    const userCoords =
      locationPrefs.locationSource === "gps"
        ? liveCoordinates
        : locationPrefs.coordinates;

    const targets = collectProximityTargets(nearbyStores, selectedStores);
    const hit = scanProximityAlert(userCoords, targets);
    if (!hit) return;

    const prefs = notificationPrefsRef.current;
    if (isProximityCooldownActive(hit.store.id, prefs.proximityCooldown)) return;

    void notifyProximityAlert(hit.store.name, hit.distanceKm, hit.kind).then((ok) => {
      if (!ok) return;
      setNotificationPrefsState((prev) => {
        const next = {
          ...prev,
          proximityCooldown: markProximityCooldown(prev.proximityCooldown, hit.store.id),
        };
        void saveNotificationPrefs(next);
        return next;
      });
    });
  }, [
    isHydrated,
    liveCoordinates,
    locationPrefs.coordinates,
    locationPrefs.locationSource,
    nearbyStores,
    selectedStores,
    notificationPrefs.proximityAlerts,
  ]);

  const setNotificationPref = useCallback(
    <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      setNotificationPrefsState((prev) => {
        const next = { ...prev, [key]: value };
        void saveNotificationPrefs(next);
        return next;
      });
    },
    [],
  );

  const refreshNotificationPermission = useCallback(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  const requestNotificationsAccess = useCallback(async () => {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
    return result;
  }, []);

  const setItems = useCallback((next: IngestedItem[]) => {
    const enriched = ensureItemAttributesList(next);
    setItemsState(enriched);
    void saveCart(enriched);
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

      const prefs = notificationPrefsRef.current;
      if (prefs.n2oTierAlerts && getNotificationPermission() === "granted") {
        const upgrade = detectN2OTierUpgrade(prev, next);
        if (upgrade && upgrade.index > prefs.lastTierIndex) {
          void notifyN2OTierUpgrade(upgrade, next).then((ok) => {
            if (!ok) return;
            setNotificationPrefsState((current) => {
              const updated = { ...current, lastTierIndex: upgrade.index };
              void saveNotificationPrefs(updated);
              return updated;
            });
          });
        }
      }

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
      notificationPrefs,
      notificationPermission,
      notificationSettingsOpen,
      setNotificationSettingsOpen,
      setNotificationPref,
      refreshNotificationPermission,
      requestNotificationsAccess,
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
      notificationPrefs,
      notificationPermission,
      notificationSettingsOpen,
      setNotificationPref,
      refreshNotificationPermission,
      requestNotificationsAccess,
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
      <div
        className="flex min-h-dvh items-center justify-center text-sm font-medium text-white"
        style={{
          background: "linear-gradient(135deg, #0041e6 0%, #0b1120 100%)",
        }}
      >
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
