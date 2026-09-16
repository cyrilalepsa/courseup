import type {
  DispatchOrder,
  DispatchStatus,
  DriveCheckoutLink,
  SelysVoucher,
} from "@/types/dispatch";
import type { OptimizedBasket, StoreSplit } from "@/types/optimizer";

function tokenForStore(storeId: string, rate: number): string {
  const seed = `${storeId}-${rate}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `NC-${Math.abs(hash).toString(16).slice(0, 8).toUpperCase()}`;
}

function buildDriveCheckout(split: StoreSplit, index: number): DriveCheckoutLink {
  const affiliationToken = tokenForStore(split.store.id, split.store.affiliationRate);
  const ratePct = Math.round(split.store.affiliationRate * 100);
  const itemSkus = split.items.map((i) => encodeURIComponent(i.name)).join(",");
  const deeplinkUrl =
    `https://affiliate.neriacorp.io/drive/${split.store.id}` +
    `?token=${affiliationToken}&aff=${ratePct}&ref=courseup&slot=${index + 1}&items=${itemSkus}`;

  return {
    id: `drive-${split.store.id}-${index}`,
    storeId: split.store.id,
    storeName: split.store.name,
    items: split.items,
    subtotal: split.subtotal,
    affiliationRate: split.store.affiliationRate,
    affiliationToken,
    deeplinkUrl,
    status: "pending",
  };
}

function buildSelysVoucher(split: StoreSplit): SelysVoucher {
  const passCode = `SLY-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const n2oApplied = Math.round(split.subtotal * 4.2);
  const qrPayload = JSON.stringify({
    type: "selys_pickup",
    pass: passCode,
    merchant: "Selys Hub Local",
    total: split.subtotal,
    n2o: n2oApplied,
  });

  return {
    id: `selys-${passCode}`,
    passCode,
    qrPayload,
    merchantHub: "Selys — Artisans partenaires",
    pickupWindow: "Aujourd'hui · 16h30 – 19h00",
    n2oApplied,
    subtotal: split.subtotal,
    items: split.items,
    status: "pending",
  };
}

export function createDispatchOrder(basket: OptimizedBasket): DispatchOrder {
  const driveSplits = basket.splits.filter((s) => s.store.type === "drive");
  const selysSplit = basket.splits.find((s) => s.store.id === "selys-local");

  const driveCheckouts = driveSplits.map((split, index) => buildDriveCheckout(split, index));
  const selysVoucher = selysSplit ? buildSelysVoucher(selysSplit) : null;

  return {
    id: `ord-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    mode: basket.mode,
    driveCheckouts,
    selysVoucher,
    totalSpent: basket.savings.optimizedTotal,
    totalSavings: basket.savings.savingsAmount,
    totalN2OCredited: basket.n2o.pointsEarned,
    globalStatus: "pending",
  };
}

export function computeGlobalStatus(
  driveCheckouts: DriveCheckoutLink[],
  selysVoucher: SelysVoucher | null,
): DispatchStatus {
  const steps: DispatchStatus[] = [
    ...driveCheckouts.map((d) => d.status),
    ...(selysVoucher ? [selysVoucher.status] : []),
  ];
  if (steps.every((s) => s === "completed")) return "completed";
  if (steps.some((s) => s === "checkout_started" || s === "exported" || s === "completed")) {
    return "checkout_started";
  }
  return "pending";
}

export function stepsFromOrder(order: DispatchOrder) {
  const driveSteps = order.driveCheckouts.map((d, i) => ({
    id: d.id,
    label: `Checkout Drive ${i + 1} · ${d.storeName.replace(" Drive", "")}`,
    kind: "drive" as const,
    status: d.status,
  }));
  const selysStep = order.selysVoucher
    ? [
        {
          id: order.selysVoucher.id,
          label: "Click&Collect Selys",
          kind: "selys" as const,
          status: order.selysVoucher.status,
        },
      ]
    : [];
  return [...driveSteps, ...selysStep];
}
