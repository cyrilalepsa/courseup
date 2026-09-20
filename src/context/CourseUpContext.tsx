import {
  useCallback,
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
import {
  computeCashbackCreditFromSavings,
  emitHeritiaFreshExport,
} from "@/services/cashbackService";
import {
  evaluateBadgeUnlocks,
  mergeBadgeRecords,
} from "@/services/badgeService";
import { isolateSelysProducts } from "@/services/selysDispatchService";
import {
  bindOnlineSyncFlush,
  enqueueSyncJob,
  flushSyncQueue,
  loadGamificationState,
  processSyncJob,
  saveCashbackLedger,
  saveGamificationBadges,
} from "@/services/syncManager";
import {
  buildHeritiaFridgePayload,
  extractFreshPerishableItems,
  forceHeritiaExportFromItems,
  HERITIA_SYNC_NOTICE_EVENT,
  queueHeritiaFridgeExport,
} from "@/services/heritiaBridgeService";
import {
  refreshDriveCatalogFromApis,
  simulateDriveApiCatalogPush,
} from "@/services/api/driveConnectorService";
import { DEMO_DRIVE_API_PUSH_BATCH } from "@/config/driveProductCatalog";
import type { HeritiaSyncNotice } from "@/types/heritia";
import type { DriveCheckoutLink } from "@/types/dispatch";
import {
  isAffiliationTrackingActive,
  setAffiliationTrackingActive as persistAffiliationMode,
  sumMonetizationTotals,
  trackDriveAffiliateRedirect,
} from "@/services/monetizationService";
import {
  filterLedgerBySession,
  loadNeriaLedger,
  recordCheckoutMonetization,
  recordOrderMonetizationLedger,
} from "@/services/neriaLedgerService";
import {
  initNeriaAuthBridge,
  signOutNeria,
  simulateWebAuthnPasskeySignIn,
  subscribeNeriaAuth,
  switchDemoNeriaUser,
} from "@/services/neriaAuthService";
import type { MonetizationSessionTotals } from "@/types/monetization";
import type { NeriaAuthSession } from "@/types/neriaAuth";
import type { CashbackLedgerEntry } from "@/types/cashback";
import type { CheckoutWalletState } from "@/types/checkout";
import type { GamificationBadgeRecord } from "@/types/gamification";
import type { ExportBundle } from "@/types/export";
import { DEFAULT_CHECKOUT_WALLET } from "@/config/checkoutWallet";
import { CourseUpContext } from "@/context/courseUpContext";
import {
  getActiveDemoProfile,
  purgeDemoIndexedDb,
  simulateGeofenceUnder2km,
  simulateN2OSync,
  subscribeDemoProfile,
  switchDemoRole,
} from "@/services/demoCockpitService";
import {
  effectiveRewardCost,
  getMerchantRewardCatalog,
  injectDemoMerchantCatalog,
} from "@/services/merchantCatalogService";
import type { CockpitDemoProfile, CockpitDemoRole } from "@/types/cockpitDemo";
import type { OptimizedBasket } from "@/types/optimizer";


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
  const [cashbackLedger, setCashbackLedger] = useState<CashbackLedgerEntry[]>([]);
  const [gamificationBadges, setGamificationBadges] = useState<GamificationBadgeRecord[]>(
    [],
  );
  const [checkoutWallet, setCheckoutWallet] = useState<CheckoutWalletState>(
    DEFAULT_CHECKOUT_WALLET,
  );
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
  const [monetizationSessionId] = useState(
    () => `mon-${Date.now().toString(36)}`,
  );
  const monetizationSessionIdRef = useRef(monetizationSessionId);
  const cockpitProfileRef = useRef(getActiveDemoProfile());
  const [cockpitDemoProfile, setCockpitDemoProfile] = useState<CockpitDemoProfile>(
    () => getActiveDemoProfile(),
  );
  const [heritiaSyncNotice, setHeritiaSyncNotice] = useState<HeritiaSyncNotice | null>(null);
  const [affiliationTrackingActive, setAffiliationTrackingActiveState] = useState(
    () => isAffiliationTrackingActive(),
  );
  const [monetizationSessionTotals, setMonetizationSessionTotals] =
    useState<MonetizationSessionTotals>(() =>
      sumMonetizationTotals([], 0),
    );
  const [neriaAuthSession, setNeriaAuthSession] = useState<NeriaAuthSession | null>(null);

  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
  }, [notificationPrefs]);

  useEffect(() => subscribeNeriaAuth(setNeriaAuthSession), []);

  useEffect(() => initNeriaAuthBridge("courseup"), []);

  useEffect(() => {
    injectDemoMerchantCatalog();
    return subscribeDemoProfile((profile) => {
      cockpitProfileRef.current = profile;
      setCockpitDemoProfile(profile);
    });
  }, []);

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

  useEffect(() => {
    if (!isHydrated) return undefined;
    return bindOnlineSyncFlush(() => {
      void flushSyncQueue(processSyncJob);
    });
  }, [isHydrated]);

  useEffect(() => {
    const onHeritiaNotice = (event: Event) => {
      const notice = (event as CustomEvent<HeritiaSyncNotice>).detail;
      if (!notice || typeof notice.freshCount !== "number") return;
      setHeritiaSyncNotice(notice);
    };
    window.addEventListener(HERITIA_SYNC_NOTICE_EVENT, onHeritiaNotice);
    return () => window.removeEventListener(HERITIA_SYNC_NOTICE_EVENT, onHeritiaNotice);
  }, []);

  const refreshMonetizationTotals = useCallback(async () => {
    const ledger = await loadNeriaLedger();
    const sessionEntries = filterLedgerBySession(
      ledger,
      monetizationSessionIdRef.current,
    );
    setMonetizationSessionTotals(sumMonetizationTotals(sessionEntries));
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
      void loadGamificationState().then((gamification) => {
        if (cancelled) return;
        setCashbackLedger(gamification.cashbackLedger);
        setGamificationBadges(gamification.badges);
        setCheckoutWallet(gamification.wallet);
      });
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
      void refreshMonetizationTotals();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshMonetizationTotals]);

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
    const { syncN2Order, isN2IngressConfigured } = await import(
      "@/services/api/n2IngressClient"
    );
    if (isN2IngressConfigured()) {
      await syncN2Order(order);
    }
  }, []);

  const creditDispatchCompletion = useCallback(
    (order: DispatchOrder, basket: OptimizedBasket, bundle: ExportBundle) => {
      const credit = computeCashbackCreditFromSavings(order.totalSavings, {
        orderId: order.id,
        source: "dispatch",
        label: "Dispatch validé",
      });
      if (credit.tokensGranted > 0) {
        setCashbackLedger((prev) => {
          const next = [credit.ledgerEntry, ...prev].slice(0, 100);
          void saveCashbackLedger(next);
          return next;
        });
        addN2OBalance(credit.tokensGranted);
      }

      emitHeritiaFreshExport(bundle);
      const payload = buildHeritiaFridgePayload(bundle.items, bundle.createdAt);
      void queueHeritiaFridgeExport(payload).then(() => {
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void flushSyncQueue(processSyncJob);
        }
      });

      const hasDiscountStop = basket.splits.some(
        (s) => s.store.id === "lidl" || s.store.id === "aldi",
      );
      const selysItemCount = isolateSelysProducts(basket).length;
      const freshItemCount = extractFreshPerishableItems(bundle.items).length;
      const badgeIds = evaluateBadgeUnlocks({
        totalSavingsEuro: order.totalSavings,
        hasDiscountStop,
        selysItemCount,
        freshItemCount,
        heritiaExportQueued: true,
      });
      setGamificationBadges((prev) => {
        const next = mergeBadgeRecords(prev, badgeIds);
        void saveGamificationBadges(next);
        void enqueueSyncJob("badge_snapshot", { badges: next });
        return next;
      });
    },
    [addN2OBalance],
  );

  const redeemMerchantReward = useCallback((rewardId: string): boolean => {
    const reward = getMerchantRewardCatalog().find((r) => r.id === rewardId);
    if (!reward) return false;
    const cost = effectiveRewardCost(reward, cockpitProfileRef.current);
    let ok = false;
    setN2oBalance((prev) => {
      if (prev < cost) return prev;
      ok = true;
      const next = prev - cost;
      void saveN2OBalance(next);
      return next;
    });
    return ok;
  }, []);

  const switchDemoCockpitRole = useCallback((role: CockpitDemoRole) => {
    switchDemoRole(role);
  }, []);

  const triggerDemoGeofenceAlert = useCallback(async () => {
    return simulateGeofenceUnder2km();
  }, []);

  const triggerDemoN2OSync = useCallback(async () => {
    await simulateN2OSync((amount) => {
      addN2OBalance(amount);
    });
  }, [addN2OBalance]);

  const purgeLocalCourseUpData = useCallback(async () => {
    await purgeDemoIndexedDb();
  }, []);

  const completeShoppingHeritiaSync = useCallback(
    async (checkedItemIds?: string[]): Promise<HeritiaSyncNotice | null> => {
      const idSet = checkedItemIds?.length ? new Set(checkedItemIds) : undefined;
      const scoped = extractFreshPerishableItems(items, {
        onlyItemIds: idSet,
      });
      const payload = buildHeritiaFridgePayload(scoped, new Date().toISOString());
      if (payload.items.length === 0) return null;
      const notice = await queueHeritiaFridgeExport(payload);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await flushSyncQueue(processSyncJob);
      }
      setHeritiaSyncNotice(notice);
      return notice;
    },
    [items],
  );

  const triggerDemoDriveApiPush = useCallback(async () => {
    simulateDriveApiCatalogPush(DEMO_DRIVE_API_PUSH_BATCH);
    await refreshDriveCatalogFromApis();
  }, []);

  const triggerDemoHeritiaExport = useCallback(async () => {
    const notice = await forceHeritiaExportFromItems(items);
    setHeritiaSyncNotice(notice);
  }, [items]);

  const clearHeritiaSyncNotice = useCallback(() => {
    setHeritiaSyncNotice(null);
  }, []);

  const setAffiliationTrackingActive = useCallback(
    (active: boolean) => {
      persistAffiliationMode(active);
      setAffiliationTrackingActiveState(active);
    },
    [],
  );

  const registerAffiliateDriveRedirect = useCallback(
    async (checkout: DriveCheckoutLink, orderId?: string) => {
      trackDriveAffiliateRedirect({
        storeId: checkout.storeId,
        storeName: checkout.storeName,
        subtotalEuro: checkout.subtotal,
        orderId,
        checkoutId: checkout.id,
      });
      await recordCheckoutMonetization(
        checkout,
        monetizationSessionIdRef.current,
        orderId,
      );
      await refreshMonetizationTotals();
    },
    [refreshMonetizationTotals],
  );

  const finalizeMonetizationForOrder = useCallback(
    async (order: DispatchOrder) => {
      await recordOrderMonetizationLedger(order, monetizationSessionIdRef.current);
      await refreshMonetizationTotals();
    },
    [refreshMonetizationTotals],
  );

  const signInDemoNeriaPasskey = useCallback(async (userId?: string) => {
    const result = await simulateWebAuthnPasskeySignIn(userId);
    if (!result.ok) {
      throw new Error(result.error ?? "Connexion Passkey échouée");
    }
  }, []);

  const switchNeriaDemoUser = useCallback(async (userId: string) => {
    const result = await switchDemoNeriaUser(userId);
    if (!result.ok) {
      throw new Error(result.error ?? "Changement utilisateur échoué");
    }
  }, []);

  const signOutNeriaAuth = useCallback(() => {
    signOutNeria();
  }, []);

  const reloadOrderFromHistory = useCallback(
    async (order: DispatchOrder) => {
      const { reloadOrderViaN2Ingress, isN2IngressConfigured } = await import(
        "@/services/api/n2IngressClient"
      );
      if (isN2IngressConfigured()) {
        const remote = await reloadOrderViaN2Ingress(order.id);
        if (remote?.items.length) {
          setItems(remote.items);
          return;
        }
      }
      const lines = [
        ...order.driveCheckouts.flatMap((checkout) => checkout.items),
        ...(order.selysVoucher?.items ?? []),
      ];
      const next = lines.map((line) =>
        createIngestedItem(
          {
            name: line.name,
            quantity: line.quantity,
            unit: line.unit,
            category: "épicerie",
            confidenceScore: 1,
          },
          "text",
        ),
      );
      setItems(next);
    },
    [setItems],
  );

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
      cashbackLedger,
      gamificationBadges,
      checkoutWallet,
      cockpitDemoProfile,
      heritiaSyncNotice,
      affiliationTrackingActive,
      monetizationSessionTotals,
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
      creditDispatchCompletion,
      redeemMerchantReward,
      switchDemoCockpitRole,
      triggerDemoGeofenceAlert,
      triggerDemoN2OSync,
      purgeLocalCourseUpData,
      completeShoppingHeritiaSync,
      triggerDemoDriveApiPush,
      triggerDemoHeritiaExport,
      clearHeritiaSyncNotice,
      setAffiliationTrackingActive,
      registerAffiliateDriveRedirect,
      finalizeMonetizationForOrder,
      neriaAuthSession,
      signInDemoNeriaPasskey,
      switchNeriaDemoUser,
      signOutNeriaAuth,
      reloadOrderFromHistory,
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
      cashbackLedger,
      gamificationBadges,
      checkoutWallet,
      cockpitDemoProfile,
      heritiaSyncNotice,
      affiliationTrackingActive,
      monetizationSessionTotals,
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
      creditDispatchCompletion,
      redeemMerchantReward,
      switchDemoCockpitRole,
      triggerDemoGeofenceAlert,
      triggerDemoN2OSync,
      purgeLocalCourseUpData,
      completeShoppingHeritiaSync,
      triggerDemoDriveApiPush,
      triggerDemoHeritiaExport,
      clearHeritiaSyncNotice,
      setAffiliationTrackingActive,
      registerAffiliateDriveRedirect,
      finalizeMonetizationForOrder,
      neriaAuthSession,
      signInDemoNeriaPasskey,
      switchNeriaDemoUser,
      signOutNeriaAuth,
      reloadOrderFromHistory,
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
