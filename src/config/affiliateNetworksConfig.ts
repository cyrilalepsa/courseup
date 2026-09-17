export type AffiliateNetworkId = "awin" | "kwanko" | "direct";

export interface AffiliateNetworkUrlTemplate {
  id: AffiliateNetworkId;
  redirectBaseUrl: string;
  destinationParam: string;
  affiliateIdParam: string;
  merchantIdParam: string;
  clickRefParam: string;
  extraParams?: Record<string, string>;
}

export const AFFILIATE_NETWORK_TEMPLATES: Record<
  AffiliateNetworkId,
  AffiliateNetworkUrlTemplate
> = {
  awin: {
    id: "awin",
    redirectBaseUrl: "https://www.awin1.com/cread.php",
    destinationParam: "ued",
    affiliateIdParam: "awinaffid",
    merchantIdParam: "awinmid",
    clickRefParam: "clickref",
    extraParams: { platform: "pl" },
  },
  kwanko: {
    id: "kwanko",
    redirectBaseUrl: "https://action.metaffiliation.com/trk.php",
    destinationParam: "mclic",
    affiliateIdParam: "argann",
    merchantIdParam: "argmod",
    clickRefParam: "argsite",
  },
  direct: {
    id: "direct",
    redirectBaseUrl: "",
    destinationParam: "",
    affiliateIdParam: "",
    merchantIdParam: "",
    clickRefParam: "",
  },
};

export interface StoreAffiliateProgram {
  storeId: string;
  network: AffiliateNetworkId;
  merchantId?: string;
  programActive: boolean;
}

function readEnv(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const STORE_IDS = [
  "carrefour",
  "leclerc",
  "auchan",
  "lidl",
  "aldi",
  "arwin",
  "selys-local",
] as const;

const NETWORK_ENV_BY_STORE: Record<string, string> = {
  carrefour: "VITE_AFF_NETWORK_CARREFOUR",
  leclerc: "VITE_AFF_NETWORK_LECLERC",
  auchan: "VITE_AFF_NETWORK_AUCHAN",
  lidl: "VITE_AFF_NETWORK_LIDL",
  aldi: "VITE_AFF_NETWORK_ALDI",
  arwin: "VITE_AFF_NETWORK_ARWIN",
  "selys-local": "VITE_AFF_NETWORK_SELYS",
};

const AWIN_MID_ENV_BY_STORE: Record<string, string> = {
  carrefour: "VITE_AWIN_MID_CARREFOUR",
  leclerc: "VITE_AWIN_MID_LECLERC",
  auchan: "VITE_AWIN_MID_AUCHAN",
  lidl: "VITE_AWIN_MID_LIDL",
  aldi: "VITE_AWIN_MID_ALDI",
  arwin: "VITE_AWIN_MID_ARWIN",
  "selys-local": "VITE_AWIN_MID_SELYS",
};

const KWANKO_PROG_ENV_BY_STORE: Record<string, string> = {
  carrefour: "VITE_KWANKO_PROG_CARREFOUR",
  leclerc: "VITE_KWANKO_PROG_LECLERC",
  auchan: "VITE_KWANKO_PROG_AUCHAN",
  lidl: "VITE_KWANKO_PROG_LIDL",
  aldi: "VITE_KWANKO_PROG_ALDI",
  arwin: "VITE_KWANKO_PROG_ARWIN",
  "selys-local": "VITE_KWANKO_PROG_SELYS",
};

const DEFAULT_NETWORK_BY_STORE: Record<string, AffiliateNetworkId> = {
  carrefour: "awin",
  leclerc: "awin",
  auchan: "kwanko",
  lidl: "direct",
  aldi: "direct",
  arwin: "direct",
  "selys-local": "direct",
};

export function getAwinAffiliateId(): string | undefined {
  return readEnv("VITE_AWIN_AFFILIATE_ID");
}

export function getKwankoPublisherId(): string | undefined {
  return readEnv("VITE_KWANKO_PUBLISHER_ID");
}

function parseNetworkId(raw: string | undefined, fallback: AffiliateNetworkId): AffiliateNetworkId {
  if (raw === "awin" || raw === "kwanko" || raw === "direct" || raw === "off") {
    if (raw === "off") return "direct";
    return raw;
  }
  return fallback;
}

export function resolveStoreAffiliateProgram(storeId: string): StoreAffiliateProgram {
  const network = parseNetworkId(
    readEnv(NETWORK_ENV_BY_STORE[storeId] ?? ""),
    DEFAULT_NETWORK_BY_STORE[storeId] ?? "direct",
  );

  if (network === "direct") {
    return { storeId, network, programActive: false };
  }

  if (network === "awin") {
    const merchantId = readEnv(AWIN_MID_ENV_BY_STORE[storeId] ?? "");
    const affiliateId = getAwinAffiliateId();
    return {
      storeId,
      network: "awin",
      merchantId,
      programActive: Boolean(merchantId && affiliateId),
    };
  }

  const merchantId = readEnv(KWANKO_PROG_ENV_BY_STORE[storeId] ?? "");
  const publisherId = getKwankoPublisherId();
  return {
    storeId,
    network: "kwanko",
    merchantId,
    programActive: Boolean(merchantId && publisherId),
  };
}

export function listAffiliateNetworkStoreIds(): string[] {
  return [...STORE_IDS];
}

export function getDemoAwinMerchantId(storeId: string): string {
  return readEnv(AWIN_MID_ENV_BY_STORE[storeId] ?? "") ?? `demo-mid-${storeId}`;
}
