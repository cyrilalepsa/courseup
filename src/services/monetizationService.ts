import { resolveAffiliationPartner } from "@/config/affiliationConfig";
import type {
  AffiliationRedirectEvent,
  CommissionModel,
  MonetizationSessionTotals,
} from "@/types/monetization";

const AFFILIATION_MODE_STORAGE_KEY = "courseup:affiliation-mode";

export function isAffiliationTrackingActive(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(AFFILIATION_MODE_STORAGE_KEY) !== "passive";
}

export function setAffiliationTrackingActive(active: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(AFFILIATION_MODE_STORAGE_KEY, active ? "active" : "passive");
}

export function getAffiliationModeLabel(): "active" | "passive" {
  return isAffiliationTrackingActive() ? "active" : "passive";
}

export interface DriveDeeplinkBuildInput {
  storeId: string;
  baseUrl: string;
  affiliationToken: string;
  affiliationRatePercent: number;
  slotIndex: number;
  itemSkus: string;
  orderId?: string;
}

export function estimatePartnerCommission(
  subtotalEuro: number,
  storeId: string,
  model: CommissionModel = "cpa",
): number {
  const partner = resolveAffiliationPartner(storeId);
  if (model === "cpl") return Number(partner.cplRateEuro.toFixed(2));
  return Number(((subtotalEuro * partner.cpaRatePercent) / 100).toFixed(2));
}

/** Injecte partner_id / sub_id et tags NeriaCorp sur les deeplinks Drive. */
export function tagAffiliateDeeplink(
  rawUrl: string,
  storeId: string,
  options?: { orderId?: string; checkoutId?: string },
): string {
  if (!isAffiliationTrackingActive()) {
    return rawUrl;
  }

  const partner = resolveAffiliationPartner(storeId);
  const url = new URL(rawUrl);
  url.searchParams.set("partner_id", partner.partnerId);
  url.searchParams.set("sub_id", partner.subId);
  url.searchParams.set("nc_aff", "1");
  url.searchParams.set("nc_track", "courseup-drive");
  if (options?.orderId) url.searchParams.set("order_id", options.orderId);
  if (options?.checkoutId) url.searchParams.set("checkout_id", options.checkoutId);
  return url.toString();
}

export function buildAffiliateDriveDeeplink(input: DriveDeeplinkBuildInput): string {
  const partner = resolveAffiliationPartner(input.storeId);
  const base =
    input.baseUrl ||
    `https://affiliate.neriacorp.io/drive/${input.storeId}`;

  const url = new URL(base);
  url.searchParams.set("token", input.affiliationToken);
  url.searchParams.set("aff", String(input.affiliationRatePercent));
  url.searchParams.set("ref", "courseup");
  url.searchParams.set("slot", String(input.slotIndex + 1));
  url.searchParams.set("items", input.itemSkus);

  if (isAffiliationTrackingActive()) {
    url.searchParams.set("partner_id", partner.partnerId);
    url.searchParams.set("sub_id", partner.subId);
    url.searchParams.set("nc_aff", "1");
    url.searchParams.set("nc_track", "courseup-drive");
    if (input.orderId) url.searchParams.set("order_id", input.orderId);
  }

  return url.toString();
}

export function dispatchAffiliationWebhook(event: AffiliationRedirectEvent): void {
  if (!isAffiliationTrackingActive()) return;
  if (typeof navigator === "undefined") return;

  const partner = resolveAffiliationPartner(event.storeId);
  const body = JSON.stringify({ ...event, webhook: "discreet" });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(partner.webhookUrl, blob);
      return;
    }
  } catch {
    /* fallback fetch */
  }

  void fetch(partner.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    mode: "no-cors",
  });
}

export interface TrackDriveRedirectInput {
  storeId: string;
  storeName: string;
  subtotalEuro: number;
  orderId?: string;
  checkoutId?: string;
}

export function trackDriveAffiliateRedirect(input: TrackDriveRedirectInput): AffiliationRedirectEvent {
  const model: CommissionModel = "cpa";
  const estimatedCommissionEuro = estimatePartnerCommission(
    input.subtotalEuro,
    input.storeId,
    model,
  );
  const partner = resolveAffiliationPartner(input.storeId);

  const event: AffiliationRedirectEvent = {
    event: "drive_redirect",
    storeId: input.storeId,
    storeName: input.storeName,
    orderId: input.orderId,
    checkoutId: input.checkoutId,
    cartSubtotalEuro: input.subtotalEuro,
    estimatedCommissionEuro,
    partnerId: partner.partnerId,
    subId: partner.subId,
    model,
    tagged: isAffiliationTrackingActive(),
    occurredAt: new Date().toISOString(),
  };

  dispatchAffiliationWebhook(event);
  return event;
}

export function tagExternalCartUrl(url: string, storeId: string): string {
  return tagAffiliateDeeplink(url, storeId);
}

export function emptyMonetizationTotals(): MonetizationSessionTotals {
  return {
    revenueEuro: 0,
    commissionEuro: 0,
    redirectCount: 0,
    ledgerEntryCount: 0,
  };
}

export function sumMonetizationTotals(
  entries: { cartSubtotalEuro: number; estimatedCommissionEuro: number }[],
  redirectCount = 0,
): MonetizationSessionTotals {
  return entries.reduce(
    (acc, row) => {
      acc.revenueEuro = Number((acc.revenueEuro + row.cartSubtotalEuro).toFixed(2));
      acc.commissionEuro = Number(
        (acc.commissionEuro + row.estimatedCommissionEuro).toFixed(2),
      );
      acc.ledgerEntryCount += 1;
      return acc;
    },
    { ...emptyMonetizationTotals(), redirectCount },
  );
}
