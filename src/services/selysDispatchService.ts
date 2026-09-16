import { buildQrPassPayload } from "@/services/exportService";
import { tagExternalCartUrl, trackDriveAffiliateRedirect } from "@/services/monetizationService";
import type { DispatchOrder } from "@/types/dispatch";
import type { AssignedLineItem, OptimizedBasket, StoreSplit } from "@/types/optimizer";

const SELYS_STORE_ID = "selys-local";
const MARKETPLACE_BASE = "https://marketplace.selys.neriacorp.io/checkout";

export interface SelysDispatchBundle {
  split: StoreSplit;
  lines: AssignedLineItem[];
  subtotal: number;
  orderId?: string;
  qrPayload: string;
}

export function isolateSelysSplit(basket: OptimizedBasket): StoreSplit | null {
  return basket.splits.find((s) => s.store.id === SELYS_STORE_ID) ?? null;
}

export function isolateSelysProducts(basket: OptimizedBasket): AssignedLineItem[] {
  return isolateSelysSplit(basket)?.items ?? [];
}

export function buildSelysMarketplaceUrl(
  bundle: SelysDispatchBundle,
  options?: { clickCollect?: boolean },
): string {
  const itemRefs = bundle.lines
    .map((line) => `${encodeURIComponent(line.name)}:${line.quantity}`)
    .join(",");
  const params = new URLSearchParams({
    ref: "courseup",
    hub: "selys-artisans",
    subtotal: String(bundle.subtotal),
    items: itemRefs,
    pass: bundle.qrPayload.slice(0, 512),
  });
  if (bundle.orderId) params.set("order", bundle.orderId);
  if (options?.clickCollect !== false) params.set("mode", "click-collect");
  return `${MARKETPLACE_BASE}?${params.toString()}`;
}

export function buildSelysDispatchBundle(
  basket: OptimizedBasket,
  order?: DispatchOrder,
): SelysDispatchBundle | null {
  const split = isolateSelysSplit(basket);
  if (!split) return null;

  const qrPayload =
    order?.selysVoucher?.qrPayload ??
    JSON.stringify({
      type: "selys_marketplace",
      store: SELYS_STORE_ID,
      total: split.subtotal,
      items: split.items.length,
    });

  return {
    split,
    lines: split.items,
    subtotal: split.subtotal,
    orderId: order?.id,
    qrPayload,
  };
}

export function openSelysMarketplace(
  basket: OptimizedBasket,
  order?: DispatchOrder,
): SelysDispatchBundle | null {
  const bundle = buildSelysDispatchBundle(basket, order);
  if (!bundle) return null;
  const url = tagExternalCartUrl(buildSelysMarketplaceUrl(bundle), SELYS_STORE_ID);
  if (typeof window !== "undefined") {
    trackDriveAffiliateRedirect({
      storeId: SELYS_STORE_ID,
      storeName: "Selys Marketplace",
      subtotalEuro: bundle.subtotal,
      orderId: bundle.orderId,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return bundle;
}

export function buildUniversalCheckoutQrPayload(
  basket: OptimizedBasket,
  items: import("@/types/ingestion").IngestedItem[],
  order?: DispatchOrder,
): string {
  const phase = order ? "dispatch" : "optimizer";
  const payload = buildQrPassPayload({
    phase,
    items,
    basket,
    order,
    createdAt: new Date().toISOString(),
  });
  const selys = isolateSelysSplit(basket);
  if (selys) {
    return JSON.stringify({
      pass: JSON.parse(payload),
      selys: { total: selys.subtotal, lines: selys.items.length },
    });
  }
  return payload;
}
