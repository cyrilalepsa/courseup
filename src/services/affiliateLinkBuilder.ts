import {
  AFFILIATE_NETWORK_TEMPLATES,
  getAwinAffiliateId,
  getKwankoPublisherId,
  resolveStoreAffiliateProgram,
  type AffiliateNetworkId,
} from "@/config/affiliateNetworksConfig";
import { isAffiliationTrackingActive } from "@/services/affiliationMode";

export interface AffiliateClickRefContext {
  storeId: string;
  orderId?: string;
  checkoutId?: string;
  sessionId?: string;
}

export interface AffiliateRedirectBuildInput extends AffiliateClickRefContext {
  destinationUrl: string;
}

export interface AffiliateRedirectBuildResult {
  url: string;
  network: AffiliateNetworkId | "fallback";
  clickRef: string;
  wrapped: boolean;
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function shouldApplyAffiliateNetworkWrap(): boolean {
  return isAffiliationTrackingActive() && isBrowserOnline();
}

export function buildClickRef(context: AffiliateClickRefContext): string {
  const segments = ["cu", context.storeId];
  if (context.orderId) segments.push(context.orderId.replace(/^ord-/, ""));
  if (context.checkoutId) segments.push(context.checkoutId);
  else if (context.sessionId) segments.push(context.sessionId.replace(/^mon-/, ""));
  const base = segments.join("-");
  return base.length <= 48 ? base : base.slice(0, 48);
}

export interface AwinDeeplinkOptions {
  awinMid: string;
  awinaffid: string;
  clickref: string;
  platform?: string;
}

/** URL de redirection Awin avec encodage du lien marchand (ued) et clickref. */
export function buildAwinDeeplink(
  destinationUrl: string,
  options: AwinDeeplinkOptions,
): string {
  const template = AFFILIATE_NETWORK_TEMPLATES.awin;
  const url = new URL(template.redirectBaseUrl);
  url.searchParams.set(template.merchantIdParam, options.awinMid);
  url.searchParams.set(template.affiliateIdParam, options.awinaffid);
  url.searchParams.set(template.destinationParam, destinationUrl);
  url.searchParams.set(template.clickRefParam, options.clickref);
  const platform = options.platform ?? template.extraParams?.platform;
  if (platform) url.searchParams.set("platform", platform);
  return url.toString();
}

export interface KwankoDeeplinkOptions {
  programId: string;
  publisherId: string;
  clickref: string;
}

export function buildKwankoDeeplink(
  destinationUrl: string,
  options: KwankoDeeplinkOptions,
): string {
  const template = AFFILIATE_NETWORK_TEMPLATES.kwanko;
  const url = new URL(template.redirectBaseUrl);
  url.searchParams.set(template.destinationParam, destinationUrl);
  url.searchParams.set(template.affiliateIdParam, options.publisherId);
  url.searchParams.set(template.merchantIdParam, options.programId);
  url.searchParams.set(template.clickRefParam, options.clickref);
  return url.toString();
}

export function buildAffiliateRedirectUrl(
  input: AffiliateRedirectBuildInput,
): AffiliateRedirectBuildResult {
  const clickRef = buildClickRef(input);

  if (!shouldApplyAffiliateNetworkWrap()) {
    return {
      url: input.destinationUrl,
      network: "fallback",
      clickRef,
      wrapped: false,
    };
  }

  const program = resolveStoreAffiliateProgram(input.storeId);

  if (!program.programActive) {
    return {
      url: input.destinationUrl,
      network: "fallback",
      clickRef,
      wrapped: false,
    };
  }

  if (program.network === "awin" && program.merchantId) {
    const awinaffid = getAwinAffiliateId();
    if (!awinaffid) {
      return {
        url: input.destinationUrl,
        network: "fallback",
        clickRef,
        wrapped: false,
      };
    }
    return {
      url: buildAwinDeeplink(input.destinationUrl, {
        awinMid: program.merchantId,
        awinaffid,
        clickref: clickRef,
      }),
      network: "awin",
      clickRef,
      wrapped: true,
    };
  }

  if (program.network === "kwanko" && program.merchantId) {
    const publisherId = getKwankoPublisherId();
    if (!publisherId) {
      return {
        url: input.destinationUrl,
        network: "fallback",
        clickRef,
        wrapped: false,
      };
    }
    return {
      url: buildKwankoDeeplink(input.destinationUrl, {
        programId: program.merchantId,
        publisherId,
        clickref: clickRef,
      }),
      network: "kwanko",
      clickRef,
      wrapped: true,
    };
  }

  return {
    url: input.destinationUrl,
    network: "fallback",
    clickRef,
    wrapped: false,
  };
}

/** Lien Awin de démo (Cockpit) pour un panier fictif Carrefour. */
export function buildDemoAwinAffiliatePreviewUrl(sessionId?: string): AffiliateRedirectBuildResult {
  const storeId = "carrefour";
  const destinationUrl =
    "https://affiliate.neriacorp.io/drive/carrefour?token=DEMO-PANIER&ref=courseup&nc_track=courseup-drive";
  const program = resolveStoreAffiliateProgram(storeId);
  const awinaffid = getAwinAffiliateId() ?? "neriacorp-demo-aff";
  const awinMid = program.merchantId ?? `demo-mid-${storeId}`;
  const clickRef = buildClickRef({
    storeId,
    orderId: "ord-demo-sprint6",
    sessionId,
  });

  return {
    url: buildAwinDeeplink(destinationUrl, {
      awinMid,
      awinaffid,
      clickref: clickRef,
    }),
    network: "awin",
    clickRef,
    wrapped: true,
  };
}
