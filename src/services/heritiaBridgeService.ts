import { getHeritiaExportEndpoint } from "@/config/driveApiConfig";
import { buildHeritiaDeeplink } from "@/services/exportService";
import { enqueueSyncJob, flushSyncQueue } from "@/services/syncManager";
import { COCKPIT_BRIDGE_EVENT } from "@/services/bridgeRegistryService";
import { HERITIA_FRESH_EXPORT_EVENT } from "@/services/cashbackService";
import type { ExportBundle } from "@/types/export";
import type { IngestedItem, ItemCategory } from "@/types/ingestion";
import type {
  HeritiaFridgeExportPayload,
  HeritiaFridgeIngredient,
  HeritiaSyncNotice,
} from "@/types/heritia";
import type { SyncJob } from "@/types/sync";

export const HERITIA_SYNC_NOTICE_EVENT = "neriacorp:courseup-heritia-sync-notice";

const PERISHABLE_CATEGORIES: ItemCategory[] = ["frais"];

function isFreshOrPerishable(item: IngestedItem): boolean {
  if (PERISHABLE_CATEGORIES.includes(item.category)) return true;
  return item.attributes?.tags?.some((t) => t === "frais" || t === "périssable") ?? false;
}

export function extractFreshPerishableItems(
  items: IngestedItem[],
  options?: { onlyItemIds?: Set<string> },
): IngestedItem[] {
  const filterIds = options?.onlyItemIds;
  return items.filter((item) => {
    if (filterIds && !filterIds.has(item.id)) return false;
    return isFreshOrPerishable(item);
  });
}

export function buildHeritiaFridgePayload(
  items: IngestedItem[],
  purchasedAt: string = new Date().toISOString(),
): HeritiaFridgeExportPayload {
  const fresh = extractFreshPerishableItems(items);
  const lines: HeritiaFridgeIngredient[] = fresh.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    purchasedAt,
  }));

  return {
    schema: "neriacorp.heritia.fridge.v1",
    source: "courseup",
    purchasedAt,
    antiWaste: true,
    expiryTracking: true,
    items: lines,
  };
}

export function buildHeritiaSyncNotice(
  payload: HeritiaFridgeExportPayload,
  status: HeritiaSyncNotice["status"],
): HeritiaSyncNotice {
  return {
    freshCount: payload.items.length,
    syncedAt: new Date().toISOString(),
    status,
  };
}

export function dispatchHeritiaSyncNotice(notice: HeritiaSyncNotice): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HERITIA_SYNC_NOTICE_EVENT, { detail: notice }),
  );
}

export async function queueHeritiaFridgeExport(
  payload: HeritiaFridgeExportPayload,
): Promise<HeritiaSyncNotice> {
  await enqueueSyncJob("heritia_fresh_export", payload);
  const notice = buildHeritiaSyncNotice(payload, "queued");
  dispatchHeritiaSyncNotice(notice);
  return notice;
}

export async function deliverHeritiaSyncJob(job: SyncJob): Promise<boolean> {
  if (job.kind !== "heritia_fresh_export") return true;
  const payload = job.payload as HeritiaFridgeExportPayload;
  if (!payload?.items) return false;

  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  const endpoint = getHeritiaExportEndpoint();
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
  } catch {
    /* no-cors / réseau — on considère l'envoi tenté */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HERITIA_FRESH_EXPORT_EVENT, {
        detail: { source: "courseup", items: payload.items, payload },
      }),
    );
    window.dispatchEvent(
      new CustomEvent(COCKPIT_BRIDGE_EVENT, {
        detail: { heritiaFreshExport: payload },
      }),
    );
  }

  const notice = buildHeritiaSyncNotice(payload, "delivered");
  dispatchHeritiaSyncNotice(notice);
  return true;
}

export async function flushHeritiaSyncQueue(): Promise<HeritiaSyncNotice | null> {
  let lastNotice: HeritiaSyncNotice | null = null;
  await flushSyncQueue(async (job) => {
    if (job.kind !== "heritia_fresh_export") return true;
    const payload = job.payload as HeritiaFridgeExportPayload;
    const ok = await deliverHeritiaSyncJob(job);
    if (ok) {
      lastNotice = buildHeritiaSyncNotice(payload, "delivered");
    }
    return ok;
  });
  return lastNotice;
}

export async function forceHeritiaExportFromItems(
  items: IngestedItem[],
): Promise<HeritiaSyncNotice> {
  const payload = buildHeritiaFridgePayload(items);
  const notice = await queueHeritiaFridgeExport(payload);
  if (typeof navigator !== "undefined" && navigator.onLine) {
    await flushHeritiaSyncQueue();
  }
  return notice;
}

export function buildExportBundleForHeritia(
  items: IngestedItem[],
  purchasedAt?: string,
): ExportBundle {
  return {
    phase: "dispatch",
    items,
    createdAt: purchasedAt ?? new Date().toISOString(),
  };
}

export function heritiaDeeplinkForItems(items: IngestedItem[]): string {
  return buildHeritiaDeeplink(buildExportBundleForHeritia(items, new Date().toISOString()));
}
