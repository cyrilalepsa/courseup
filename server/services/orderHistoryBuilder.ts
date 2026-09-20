import type { N2OrderHistoryEntry } from "../../shared/n2IngressApi.js";

export function buildHistoryRowsFromOrderPayload(
  order: Record<string, unknown>,
): N2OrderHistoryEntry[] {
  const orderId = String(order.id ?? "unknown");
  const createdAt = String(order.createdAt ?? new Date().toISOString());
  const globalStatus = String(order.globalStatus ?? "pending");
  const heritiaSync =
    globalStatus === "completed"
      ? "synced"
      : globalStatus === "checkout_started"
        ? "pending"
        : "pending";

  const rows: N2OrderHistoryEntry[] = [];
  const driveCheckouts = Array.isArray(order.driveCheckouts) ? order.driveCheckouts : [];

  for (const drive of driveCheckouts) {
    if (!drive || typeof drive !== "object") continue;
    const checkout = drive as Record<string, unknown>;
    rows.push({
      id: `${orderId}-${String(checkout.id ?? "drive")}`,
      orderId,
      kind: "drive",
      label: "Drive",
      storeName: String(checkout.storeName ?? "Drive"),
      date: createdAt,
      totalEuro: Number(checkout.subtotal ?? 0),
      n2oCredited: Math.round(Number(checkout.subtotal ?? 0) * 2.1),
      heritiaSync: "na",
      status: String(checkout.status ?? globalStatus),
    });
  }

  const selys = order.selysVoucher;
  if (selys && typeof selys === "object") {
    const voucher = selys as Record<string, unknown>;
    rows.push({
      id: `${orderId}-selys`,
      orderId,
      kind: "selys",
      label: "Selys Click&Collect",
      storeName: String(voucher.merchantHub ?? "Selys"),
      date: createdAt,
      totalEuro: Number(voucher.subtotal ?? 0),
      n2oCredited: Number(voucher.n2oApplied ?? 0),
      heritiaSync: "na",
      status: String(voucher.status ?? globalStatus),
    });
  }

  if (rows.length === 0 && Number(order.totalSpent ?? 0) > 0) {
    rows.push({
      id: `${orderId}-instore`,
      orderId,
      kind: "instore",
      label: "Pass Caisse In-Store",
      storeName: "Course magasin",
      date: createdAt,
      totalEuro: Number(order.totalSpent ?? 0),
      n2oCredited: Number(order.totalN2OCredited ?? 0),
      heritiaSync,
      status: globalStatus,
    });
  }

  return rows;
}

export function extractReloadItems(order: Record<string, unknown>): Record<string, unknown>[] {
  const lines: Record<string, unknown>[] = [];
  const driveCheckouts = Array.isArray(order.driveCheckouts) ? order.driveCheckouts : [];
  for (const drive of driveCheckouts) {
    if (!drive || typeof drive !== "object") continue;
    const items = (drive as Record<string, unknown>).items;
    if (Array.isArray(items)) {
      for (const line of items) {
        if (line && typeof line === "object") lines.push(line as Record<string, unknown>);
      }
    }
  }
  const selys = order.selysVoucher;
  if (selys && typeof selys === "object") {
    const items = (selys as Record<string, unknown>).items;
    if (Array.isArray(items)) {
      for (const line of items) {
        if (line && typeof line === "object") lines.push(line as Record<string, unknown>);
      }
    }
  }
  return lines;
}
