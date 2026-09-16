import { CASHBACK_ENGINE_CONFIG } from "@/config/cashbackConfig";
import { buildHeritiaDeeplink, itemsForHeritiaExport } from "@/services/exportService";
import type { ExportBundle } from "@/types/export";
import type {
  CashbackCreditResult,
  CashbackEngineConfig,
  CashbackLedgerEntry,
} from "@/types/cashback";
import type { OptimizedBasket } from "@/types/optimizer";
import { COCKPIT_BRIDGE_EVENT } from "@/services/bridgeRegistryService";

export const HERITIA_FRESH_EXPORT_EVENT = "neriacorp:courseup-heritia-fresh-export";

function entryId(): string {
  return `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCashbackConfig(): CashbackEngineConfig {
  return { ...CASHBACK_ENGINE_CONFIG };
}

/** Jetons N2O crédités : floor(économies € / ratio configurable). */
export function computeTokensFromSavingsEuro(
  savingsEuro: number,
  config: CashbackEngineConfig = CASHBACK_ENGINE_CONFIG,
): number {
  if (savingsEuro <= 0 || config.eurosPerN2OToken <= 0) return 0;
  return Math.floor(savingsEuro / config.eurosPerN2OToken);
}

export function computeCashbackCreditFromSavings(
  savingsEuro: number,
  options?: {
    config?: CashbackEngineConfig;
    source?: CashbackLedgerEntry["source"];
    orderId?: string;
    label?: string;
  },
): CashbackCreditResult {
  const config = options?.config ?? CASHBACK_ENGINE_CONFIG;
  const tokensGranted = computeTokensFromSavingsEuro(savingsEuro, config);
  const ledgerEntry: CashbackLedgerEntry = {
    id: entryId(),
    createdAt: new Date().toISOString(),
    savingsEuro: Number(savingsEuro.toFixed(2)),
    tokensGranted,
    source: options?.source ?? "dispatch",
    orderId: options?.orderId,
    label: options?.label,
  };
  return {
    savingsEuro: ledgerEntry.savingsEuro,
    tokensGranted,
    config,
    ledgerEntry,
  };
}

export function computeCashbackCreditFromBasket(
  basket: OptimizedBasket,
  orderId?: string,
): CashbackCreditResult {
  const savingsEuro = basket.savings.savingsAmount;
  return computeCashbackCreditFromSavings(savingsEuro, {
    orderId,
    source: "dispatch",
    label: `Panier ${basket.mode}`,
  });
}

export function emitHeritiaFreshExport(bundle: ExportBundle): string {
  const freshItems = itemsForHeritiaExport(bundle);
  const deeplink = buildHeritiaDeeplink(bundle);
  const detail = {
    source: "courseup",
    bridgeId: "heritia",
    purchasedAt: bundle.createdAt,
    items: freshItems,
    deeplink,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HERITIA_FRESH_EXPORT_EVENT, { detail }),
    );
    window.dispatchEvent(
      new CustomEvent(COCKPIT_BRIDGE_EVENT, {
        detail: { heritiaFreshExport: detail },
      }),
    );
  }

  return deeplink;
}

export function applyCashbackCreditToBalance(
  balance: number,
  credit: CashbackCreditResult,
): number {
  return balance + credit.tokensGranted;
}
