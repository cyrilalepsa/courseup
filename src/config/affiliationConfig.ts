import type { AffiliationPartnerParams } from "@/types/monetization";

function readEnv(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumberEnv(key: string, fallback: number): number {
  const raw = readEnv(key);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PARTNER_ENV_KEYS: Record<
  string,
  { partnerId: string; subId: string; cpa: string; cpl: string }
> = {
  carrefour: {
    partnerId: "VITE_AFF_PARTNER_CARREFOUR",
    subId: "VITE_AFF_SUB_CARREFOUR",
    cpa: "VITE_AFF_CPA_CARREFOUR",
    cpl: "VITE_AFF_CPL_CARREFOUR",
  },
  leclerc: {
    partnerId: "VITE_AFF_PARTNER_LECLERC",
    subId: "VITE_AFF_SUB_LECLERC",
    cpa: "VITE_AFF_CPA_LECLERC",
    cpl: "VITE_AFF_CPL_LECLERC",
  },
  auchan: {
    partnerId: "VITE_AFF_PARTNER_AUCHAN",
    subId: "VITE_AFF_SUB_AUCHAN",
    cpa: "VITE_AFF_CPA_AUCHAN",
    cpl: "VITE_AFF_CPL_AUCHAN",
  },
  lidl: {
    partnerId: "VITE_AFF_PARTNER_LIDL",
    subId: "VITE_AFF_SUB_LIDL",
    cpa: "VITE_AFF_CPA_LIDL",
    cpl: "VITE_AFF_CPL_LIDL",
  },
  aldi: {
    partnerId: "VITE_AFF_PARTNER_ALDI",
    subId: "VITE_AFF_SUB_ALDI",
    cpa: "VITE_AFF_CPA_ALDI",
    cpl: "VITE_AFF_CPL_ALDI",
  },
  arwin: {
    partnerId: "VITE_AFF_PARTNER_ARWIN",
    subId: "VITE_AFF_SUB_ARWIN",
    cpa: "VITE_AFF_CPA_ARWIN",
    cpl: "VITE_AFF_CPL_ARWIN",
  },
  "selys-local": {
    partnerId: "VITE_AFF_PARTNER_SELYS",
    subId: "VITE_AFF_SUB_SELYS",
    cpa: "VITE_AFF_CPA_SELYS",
    cpl: "VITE_AFF_CPL_SELYS",
  },
};

const DEFAULT_CPA_BY_STORE: Record<string, number> = {
  carrefour: 5,
  leclerc: 3,
  auchan: 7,
  lidl: 2,
  aldi: 2.5,
  arwin: 4,
  "selys-local": 6,
};

export function getGlobalAffiliationWebhookUrl(): string {
  return (
    readEnv("VITE_AFF_WEBHOOK_URL") ??
    "https://cockpit.neriacorp.io/hooks/affiliate/track"
  );
}

export function resolveAffiliationPartner(storeId: string): AffiliationPartnerParams {
  const keys = PARTNER_ENV_KEYS[storeId] ?? PARTNER_ENV_KEYS.carrefour;
  const fallbackPartner = `nc-${storeId}`;
  return {
    storeId,
    partnerId: readEnv(keys.partnerId) ?? fallbackPartner,
    subId: readEnv(keys.subId) ?? `courseup-${storeId}`,
    cpaRatePercent: readNumberEnv(keys.cpa, DEFAULT_CPA_BY_STORE[storeId] ?? 3),
    cplRateEuro: readNumberEnv(keys.cpl, 0.35),
    webhookUrl: getGlobalAffiliationWebhookUrl(),
  };
}

export function listConfiguredAffiliationStoreIds(): string[] {
  return Object.keys(PARTNER_ENV_KEYS);
}
