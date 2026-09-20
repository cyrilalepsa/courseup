import type { N2ReceiptOcrRequest, N2ReceiptOcrResponse } from "@shared/n2ReceiptOcr";
import {
  N2_HEADERS,
  N2_TENANT_COURSEUP,
  type N2AvatarSaveRequest,
  type N2AvatarSaveResponse,
  type N2BonusAppRequest,
  type N2BonusAppResponse,
  type N2OrderHistoryResponse,
  type N2OrderReloadRequest,
  type N2OrderReloadResponse,
} from "@shared/n2IngressApi";
import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import { getNeriaAuthSession } from "@/services/neriaAuthService";

const API_BASE = import.meta.env.VITE_N2_INGRESS_URL ?? "";

function ingressEnabled(): boolean {
  return Boolean(API_BASE) || import.meta.env.DEV;
}

function resolveBaseUrl(): string {
  if (API_BASE) return API_BASE.replace(/\/$/, "");
  if (import.meta.env.DEV) return "";
  return "";
}

function buildHeaders(): HeadersInit {
  const session = getNeriaAuthSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [N2_HEADERS.tenant]: N2_TENANT_COURSEUP,
    [N2_HEADERS.legacyTenant]: N2_TENANT_COURSEUP,
  };
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return headers;
}

async function n2Fetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!ingressEnabled()) return null;
  const base = resolveBaseUrl();
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: { ...buildHeaders(), ...(init?.headers ?? {}) },
      credentials: "include",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function isN2IngressConfigured(): boolean {
  return ingressEnabled() && Boolean(getNeriaAuthSession()?.accessToken);
}

export async function fetchN2UserProfile() {
  return n2Fetch<{ profile: import("@shared/n2IngressApi").N2UnifiedUserProfile }>(
    "/api/user/profile",
  );
}

export async function postN2UserAvatar(
  body: N2AvatarSaveRequest,
): Promise<N2AvatarSaveResponse | null> {
  return n2Fetch<N2AvatarSaveResponse>("/api/user/avatar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchN2OrderHistory(): Promise<N2OrderHistoryResponse | null> {
  return n2Fetch<N2OrderHistoryResponse>("/api/orders/history");
}

export async function postN2OrderReload(
  body: N2OrderReloadRequest,
): Promise<N2OrderReloadResponse | null> {
  return n2Fetch<N2OrderReloadResponse>("/api/orders/reload", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function syncN2Order(order: DispatchOrder): Promise<void> {
  await n2Fetch("/api/orders/sync", {
    method: "POST",
    body: JSON.stringify(order),
  });
}

export async function postN2ReceiptOcr(
  body: N2ReceiptOcrRequest,
): Promise<N2ReceiptOcrResponse | null> {
  return n2Fetch<N2ReceiptOcrResponse>("/api/ocr/receipt", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postN2BonusApp(
  body: N2BonusAppRequest,
): Promise<N2BonusAppResponse | null> {
  return n2Fetch<N2BonusAppResponse>("/api/subscription/bonus-app", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function reloadOrderViaN2Ingress(
  orderId: string,
): Promise<{ order: DispatchOrder; items: IngestedItem[] } | null> {
  const response = await postN2OrderReload({ orderId });
  if (!response) return null;
  return {
    order: response.order as unknown as DispatchOrder,
    items: response.items as unknown as IngestedItem[],
  };
}
