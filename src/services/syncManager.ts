import { STORAGE_KEYS, storageRead, storageWrite } from "@/services/storageService";
import type { CashbackLedgerEntry } from "@/types/cashback";
import type { CheckoutWalletState } from "@/types/checkout";
import type { GamificationBadgeRecord } from "@/types/gamification";
import type { SyncJob } from "@/types/sync";
import { DEFAULT_CHECKOUT_WALLET } from "@/config/checkoutWallet";

export interface GamificationPersistedState {
  cashbackLedger: CashbackLedgerEntry[];
  badges: GamificationBadgeRecord[];
  wallet: CheckoutWalletState;
  syncQueue: SyncJob[];
}

const EMPTY_STATE: GamificationPersistedState = {
  cashbackLedger: [],
  badges: [],
  wallet: DEFAULT_CHECKOUT_WALLET,
  syncQueue: [],
};

export async function loadGamificationState(): Promise<GamificationPersistedState> {
  const [cashbackLedger, badges, wallet, syncQueue] = await Promise.all([
    storageRead<CashbackLedgerEntry[]>(STORAGE_KEYS.cashbackLedger),
    storageRead<GamificationBadgeRecord[]>(STORAGE_KEYS.gamificationBadges),
    storageRead<CheckoutWalletState>(STORAGE_KEYS.loyaltyWallet),
    storageRead<SyncJob[]>(STORAGE_KEYS.syncQueue),
  ]);

  return {
    cashbackLedger: cashbackLedger ?? [],
    badges: badges ?? [],
    wallet: wallet ?? DEFAULT_CHECKOUT_WALLET,
    syncQueue: syncQueue ?? [],
  };
}

export async function saveCashbackLedger(entries: CashbackLedgerEntry[]): Promise<void> {
  await storageWrite(STORAGE_KEYS.cashbackLedger, entries.slice(0, 100));
}

export async function saveGamificationBadges(badges: GamificationBadgeRecord[]): Promise<void> {
  await storageWrite(STORAGE_KEYS.gamificationBadges, badges);
}

export async function saveCheckoutWallet(wallet: CheckoutWalletState): Promise<void> {
  await storageWrite(STORAGE_KEYS.loyaltyWallet, wallet);
}

export async function saveSyncQueue(queue: SyncJob[]): Promise<void> {
  await storageWrite(STORAGE_KEYS.syncQueue, queue.slice(0, 50));
}

export async function enqueueSyncJob(
  kind: SyncJob["kind"],
  payload: unknown,
): Promise<SyncJob[]> {
  const current = (await storageRead<SyncJob[]>(STORAGE_KEYS.syncQueue)) ?? [];
  const job: SyncJob = {
    id: `sync-${Date.now().toString(36)}`,
    kind,
    createdAt: new Date().toISOString(),
    payload,
    attempts: 0,
  };
  const next = [job, ...current].slice(0, 50);
  await saveSyncQueue(next);
  return next;
}

export async function flushSyncQueue(
  handler: (job: SyncJob) => Promise<boolean>,
): Promise<SyncJob[]> {
  const queue = (await storageRead<SyncJob[]>(STORAGE_KEYS.syncQueue)) ?? [];
  if (!queue.length) return [];

  const remaining: SyncJob[] = [];
  for (const job of queue) {
    try {
      const ok = await handler(job);
      if (!ok) remaining.push({ ...job, attempts: job.attempts + 1 });
    } catch {
      remaining.push({ ...job, attempts: job.attempts + 1 });
    }
  }
  await saveSyncQueue(remaining);
  return remaining;
}

export function bindOnlineSyncFlush(flush: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onOnline = () => flush();
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}

export { EMPTY_STATE as DEFAULT_GAMIFICATION_STATE };
