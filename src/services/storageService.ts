import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";

const DB_NAME = "courseup-offline";
const DB_VERSION = 1;
const STORE = "kv";

const LS_PREFIX = "courseup:";

export const STORAGE_KEYS = {
  cart: "cart",
  orders: "ordersHistory",
  n2oBalance: "n2oBalance",
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

async function read<T>(key: StorageKey): Promise<T | null> {
  try {
    const fromIdb = await idbGet<T>(key);
    if (fromIdb != null) return fromIdb;
  } catch {
    /* fallback */
  }
  return lsGet<T>(key);
}

async function write<T>(key: StorageKey, value: T): Promise<void> {
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
}

export async function loadPersistedState(): Promise<PersistedState> {
  const [cart, ordersHistory, n2oBalance] = await Promise.all([
    read<IngestedItem[]>(STORAGE_KEYS.cart),
    read<DispatchOrder[]>(STORAGE_KEYS.orders),
    read<number>(STORAGE_KEYS.n2oBalance),
  ]);

  return {
    cart: cart ?? [],
    ordersHistory: ordersHistory ?? [],
    n2oBalance: typeof n2oBalance === "number" ? n2oBalance : DEFAULT_N2O_BALANCE,
  };
}

export async function saveCart(items: IngestedItem[]): Promise<void> {
  await write(STORAGE_KEYS.cart, items);
}

export async function saveOrdersHistory(orders: DispatchOrder[]): Promise<void> {
  await write(STORAGE_KEYS.orders, orders);
}

export async function saveN2OBalance(balance: number): Promise<void> {
  await write(STORAGE_KEYS.n2oBalance, balance);
}

export async function appendOrder(order: DispatchOrder): Promise<void> {
  const current = (await read<DispatchOrder[]>(STORAGE_KEYS.orders)) ?? [];
  if (current.some((o) => o.id === order.id)) return;
  await saveOrdersHistory([order, ...current].slice(0, 50));
}
