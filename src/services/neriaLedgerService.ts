import { resolveAffiliationPartner } from "@/config/affiliationConfig";
import {
  estimatePartnerCommission,
  isAffiliationTrackingActive,
} from "@/services/monetizationService";
import { STORAGE_KEYS, storageRead, storageWrite } from "@/services/storageService";
import type { DriveCheckoutLink, DispatchOrder } from "@/types/dispatch";
import type { NeriaCockpitLedgerBatch, NeriaLedgerEntry } from "@/types/neriaLedger";

function entryId(): string {
  return `nl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function loadNeriaLedger(): Promise<NeriaLedgerEntry[]> {
  return (await storageRead<NeriaLedgerEntry[]>(STORAGE_KEYS.neriaLedger)) ?? [];
}

export async function appendNeriaLedgerEntry(entry: NeriaLedgerEntry): Promise<NeriaLedgerEntry[]> {
  const current = await loadNeriaLedger();
  const next = [entry, ...current].slice(0, 200);
  await storageWrite(STORAGE_KEYS.neriaLedger, next);
  return next;
}

export function buildLedgerEntryFromCheckout(
  checkout: DriveCheckoutLink,
  sessionId: string,
  orderId?: string,
): NeriaLedgerEntry {
  const partner = resolveAffiliationPartner(checkout.storeId);
  const commission = estimatePartnerCommission(checkout.subtotal, checkout.storeId, "cpa");

  return {
    id: entryId(),
    sessionId,
    createdAt: new Date().toISOString(),
    orderId,
    checkoutId: checkout.id,
    storeId: checkout.storeId,
    storeName: checkout.storeName,
    cartSubtotalEuro: checkout.subtotal,
    estimatedCommissionEuro: commission,
    commissionModel: "cpa",
    partnerId: partner.partnerId,
    subId: partner.subId,
    affiliationTagged: isAffiliationTrackingActive(),
  };
}

export async function recordCheckoutMonetization(
  checkout: DriveCheckoutLink,
  sessionId: string,
  orderId?: string,
): Promise<NeriaLedgerEntry[]> {
  return appendNeriaLedgerEntry(buildLedgerEntryFromCheckout(checkout, sessionId, orderId));
}

export async function recordOrderMonetizationLedger(
  order: DispatchOrder,
  sessionId: string,
): Promise<NeriaLedgerEntry[]> {
  let ledger = await loadNeriaLedger();
  for (const checkout of order.driveCheckouts) {
    if (ledger.some((e) => e.checkoutId === checkout.id && e.orderId === order.id)) {
      continue;
    }
    ledger = await appendNeriaLedgerEntry(
      buildLedgerEntryFromCheckout(checkout, sessionId, order.id),
    );
  }
  return ledger;
}

export function filterLedgerBySession(
  ledger: NeriaLedgerEntry[],
  sessionId: string,
): NeriaLedgerEntry[] {
  return ledger.filter((e) => e.sessionId === sessionId);
}

export function buildCockpitConsolidationPayload(
  sessionId: string,
  entries: NeriaLedgerEntry[],
): NeriaCockpitLedgerBatch {
  const totals = entries.reduce(
    (acc, row) => {
      acc.revenueEuro = Number((acc.revenueEuro + row.cartSubtotalEuro).toFixed(2));
      acc.commissionEuro = Number(
        (acc.commissionEuro + row.estimatedCommissionEuro).toFixed(2),
      );
      return acc;
    },
    { revenueEuro: 0, commissionEuro: 0 },
  );

  return {
    schema: "neriacorp.monetization.ledger.v1",
    sessionId,
    exportedAt: new Date().toISOString(),
    affiliationMode: isAffiliationTrackingActive() ? "active" : "passive",
    entries,
    totals,
  };
}

export async function getSessionLedgerEntries(sessionId: string): Promise<NeriaLedgerEntry[]> {
  const ledger = await loadNeriaLedger();
  return filterLedgerBySession(ledger, sessionId);
}
