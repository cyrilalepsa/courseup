import type { MacroAisleId } from "@/types/aisle";
import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import {
  DEFAULT_LOCATION_PREFS,
  type LocationPreferences,
} from "@/types/store";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPreferences,
} from "@/types/notifications";

const DB_NAME = "courseup-offline";
const DB_VERSION = 2;
const STORE = "kv";

const LS_PREFIX = "courseup:";

export const STORAGE_KEYS = {
  cart: "cart",
  orders: "ordersHistory",
  n2oBalance: "n2oBalance",
  locationPrefs: "locationPrefs",
  notificationPrefs: "notificationPrefs",
  aisleLayouts: "aisleLayouts",
  instoreSession: "instoreSession",
  cashbackLedger: "cashbackLedger",
  gamificationBadges: "gamificationBadges",
  loyaltyWallet: "loyaltyWallet",
  syncQueue: "syncQueue",
  neriaLedger: "neriaLedger",
} as const;

export const DEFAULT_N2O_BALANCE = 1250;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function lsGet<T>(key: StorageKey): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function lsSet<T>(key: StorageKey, value: T): void {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbGet<T>(key: StorageKey): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as T | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function idbSet<T>(key: StorageKey, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.put(value, key);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function storageRead<T>(key: StorageKey): Promise<T | null> {
  try {
    const fromIdb = await idbGet<T>(key);
    if (fromIdb != null) return fromIdb;
  } catch {
    /* fallback */
  }
  return lsGet<T>(key);
}

export async function storageWrite<T>(key: StorageKey, value: T): Promise<void> {
  lsSet(key, value);
  try {
    await idbSet(key, value);
  } catch {
    /* localStorage already updated */
  }
}

export interface PersistedState {
  cart: IngestedItem[];
  ordersHistory: DispatchOrder[];
  n2oBalance: number;
  locationPrefs: LocationPreferences;
  notificationPrefs: NotificationPreferences;
}

export async function loadPersistedState(): Promise<PersistedState> {
  const [cart, ordersHistory, n2oBalance, locationPrefs, notificationPrefs] =
    await Promise.all([
    storageRead<IngestedItem[]>(STORAGE_KEYS.cart),
    storageRead<DispatchOrder[]>(STORAGE_KEYS.orders),
    storageRead<number>(STORAGE_KEYS.n2oBalance),
    storageRead<LocationPreferences>(STORAGE_KEYS.locationPrefs),
    storageRead<NotificationPreferences>(STORAGE_KEYS.notificationPrefs),
  ]);

  return {
    cart: cart ?? [],
    ordersHistory: ordersHistory ?? [],
    n2oBalance: typeof n2oBalance === "number" ? n2oBalance : DEFAULT_N2O_BALANCE,
    locationPrefs: locationPrefs ?? DEFAULT_LOCATION_PREFS,
    notificationPrefs: notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  };
}

export async function saveCart(items: IngestedItem[]): Promise<void> {
  await storageWrite(STORAGE_KEYS.cart, items);
}

export async function saveOrdersHistory(orders: DispatchOrder[]): Promise<void> {
  await storageWrite(STORAGE_KEYS.orders, orders);
}

export async function saveN2OBalance(balance: number): Promise<void> {
  await storageWrite(STORAGE_KEYS.n2oBalance, balance);
}

export async function saveLocationPrefs(prefs: LocationPreferences): Promise<void> {
  await storageWrite(STORAGE_KEYS.locationPrefs, prefs);
}

export async function saveNotificationPrefs(prefs: NotificationPreferences): Promise<void> {
  await storageWrite(STORAGE_KEYS.notificationPrefs, prefs);
}

export async function appendOrder(order: DispatchOrder): Promise<void> {
  const current = (await storageRead<DispatchOrder[]>(STORAGE_KEYS.orders)) ?? [];
  if (current.some((o) => o.id === order.id)) return;
  await saveOrdersHistory([order, ...current].slice(0, 50));
}

type AisleLayoutMap = Record<string, MacroAisleId[]>;

export interface InStoreSessionState {
  storeId: string;
  checkedIds: string[];
  deferredIds: string[];
  updatedAt: string;
}

export async function loadAisleOrder(storeId: string): Promise<MacroAisleId[] | null> {
  const map = await storageRead<AisleLayoutMap>(STORAGE_KEYS.aisleLayouts);
  return map?.[storeId] ?? null;
}

export async function saveAisleOrder(storeId: string, order: MacroAisleId[]): Promise<void> {
  const map = (await storageRead<AisleLayoutMap>(STORAGE_KEYS.aisleLayouts)) ?? {};
  map[storeId] = order;
  await storageWrite(STORAGE_KEYS.aisleLayouts, map);
}

export async function loadInStoreSession(): Promise<InStoreSessionState | null> {
  return storageRead<InStoreSessionState>(STORAGE_KEYS.instoreSession);
}

export async function saveInStoreSession(session: InStoreSessionState): Promise<void> {
  await storageWrite(STORAGE_KEYS.instoreSession, session);
}

/** Purge IndexedDB CourseUp + clés localStorage (recette démo). */
export async function purgeAllCourseUpStorage(): Promise<void> {
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem("courseup:bridge-registry:v1");
    localStorage.removeItem("neria:auth:session:v1");
    localStorage.removeItem("neria:auth:credentials:v1");
    localStorage.removeItem("neria:session-bridge:v1");
    localStorage.removeItem("neria:auth:avatar:v1");
    localStorage.removeItem("neria:auth:profile:v1");
  } catch {
    /* ignore */
  }

  if (typeof indexedDB === "undefined") return;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB purge failed"));
    request.onblocked = () => resolve();
  });
}
