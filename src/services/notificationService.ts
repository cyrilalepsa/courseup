import type { DispatchOrder } from "@/types/dispatch";
import type { NotificationPermissionState } from "@/types/notifications";

export type CourseUpNotificationKind =
  | "drive_reminder"
  | "n2o_tier"
  | "proximity"
  | "demo";

export interface CourseUpNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  kind: CourseUpNotificationKind;
  url?: string;
}

const ICON = "/favicon.svg";

export interface N2OTier {
  index: number;
  label: string;
  minBalance: number;
}

export const N2O_TIERS: N2OTier[] = [
  { index: 0, label: "Bronze N2O", minBalance: 0 },
  { index: 1, label: "Silver Match", minBalance: 500 },
  { index: 2, label: "Gold Panier", minBalance: 1000 },
  { index: 3, label: "Platinum Dispatch", minBalance: 1500 },
];

export function getN2OTier(balance: number): N2OTier {
  let tier = N2O_TIERS[0];
  for (const candidate of N2O_TIERS) {
    if (balance >= candidate.minBalance) tier = candidate;
  }
  return tier;
}

export function detectN2OTierUpgrade(previousBalance: number, nextBalance: number): N2OTier | null {
  const prevTier = getN2OTier(previousBalance);
  const nextTier = getN2OTier(nextBalance);
  if (nextTier.index > prevTier.index) return nextTier;
  return null;
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

async function postToServiceWorker(payload: CourseUpNotificationPayload): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const worker = reg.active ?? reg.waiting ?? reg.installing;
    if (!worker) return false;
    worker.postMessage({
      type: "COURSEUP_SHOW_NOTIFICATION",
      title: payload.title,
      body: payload.body,
      tag: payload.tag ?? payload.kind,
      icon: ICON,
      url: payload.url ?? "/",
      kind: payload.kind,
    });
    return true;
  } catch {
    return false;
  }
}

export async function showCourseUpNotification(
  payload: CourseUpNotificationPayload,
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  await postToServiceWorker(payload);

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(payload.title, {
      body: payload.body,
      icon: ICON,
      badge: ICON,
      tag: payload.tag ?? payload.kind,
      data: { url: payload.url ?? "/", kind: payload.kind },
    });
    return true;
  } catch {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: ICON,
        tag: payload.tag ?? payload.kind,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export async function notifyDrivePickupReminder(order: DispatchOrder): Promise<boolean> {
  const storeNames = order.driveCheckouts.map((c) => c.storeName.replace(" Drive", ""));
  const label =
    storeNames.length > 0 ? storeNames.join(", ") : "Selys / retrait local";

  return showCourseUpNotification({
    kind: "drive_reminder",
    tag: `drive-${order.id}`,
    title: "Commande drive à récupérer",
    body: `Votre panier CourseUp (${order.totalSpent.toFixed(2)} €) est prêt — retrait : ${label}.`,
    url: "/",
  });
}

export async function notifyN2OTierUpgrade(
  tier: N2OTier,
  balance: number,
): Promise<boolean> {
  return showCourseUpNotification({
    kind: "n2o_tier",
    tag: `n2o-tier-${tier.index}`,
    title: "Nouveau palier N2O",
    body: `Cashback opportunité : vous passez au palier ${tier.label} (${balance.toLocaleString("fr-FR")} N2O cumulés).`,
    url: "/",
  });
}

export async function notifyProximityAlert(
  storeName: string,
  distanceKm: number,
  kind: "selys" | "drive",
): Promise<boolean> {
  const prefix =
    kind === "selys"
      ? "Commerce Selys partenaire"
      : "Votre drive habituel";

  return showCourseUpNotification({
    kind: "proximity",
    tag: `proximity-${storeName}`,
    title: "Opportunité à proximité",
    body: `${prefix} « ${storeName} » à ${distanceKm.toFixed(1)} km — cashback N2O & retrait drive.`,
    url: "/",
  });
}

export async function sendDemoNotification(): Promise<boolean> {
  return showCourseUpNotification({
    kind: "demo",
    tag: "courseup-demo",
    title: "CourseUp · démonstration",
    body: "Notifications PWA actives — proximité Selys/drives & paliers N2O.",
    url: "/",
  });
}
