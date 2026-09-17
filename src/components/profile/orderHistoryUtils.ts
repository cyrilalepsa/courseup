import type { DispatchOrder } from "@/types/dispatch";
import type { AssignedLineItem } from "@/types/optimizer";

export type OrderChannelKind = "drive" | "selys" | "instore";

export interface OrderHistoryRow {
  id: string;
  orderId: string;
  kind: OrderChannelKind;
  label: string;
  storeName: string;
  date: string;
  totalEuro: number;
  n2oCredited: number;
  heritiaSync: "synced" | "pending" | "na";
  status: DispatchOrder["globalStatus"];
}

export function buildOrderHistoryRows(orders: DispatchOrder[]): OrderHistoryRow[] {
  const rows: OrderHistoryRow[] = [];

  for (const order of orders) {
    const heritiaSync =
      order.globalStatus === "completed"
        ? "synced"
        : order.globalStatus === "checkout_started"
          ? "pending"
          : "pending";

    for (const drive of order.driveCheckouts) {
      rows.push({
        id: `${order.id}-${drive.id}`,
        orderId: order.id,
        kind: "drive",
        label: "Drive",
        storeName: drive.storeName,
        date: order.createdAt,
        totalEuro: drive.subtotal,
        n2oCredited: Math.round(drive.subtotal * 2.1),
        heritiaSync: drive.items.some((i) => i.name.toLowerCase().includes("lait"))
          ? heritiaSync
          : "na",
        status: drive.status,
      });
    }

    if (order.selysVoucher) {
      rows.push({
        id: `${order.id}-selys`,
        orderId: order.id,
        kind: "selys",
        label: "Selys Click&Collect",
        storeName: order.selysVoucher.merchantHub,
        date: order.createdAt,
        totalEuro: order.selysVoucher.subtotal,
        n2oCredited: order.selysVoucher.n2oApplied,
        heritiaSync: "na",
        status: order.selysVoucher.status,
      });
    }

    if (
      order.driveCheckouts.length === 0 &&
      !order.selysVoucher &&
      order.totalSpent > 0
    ) {
      rows.push({
        id: `${order.id}-instore`,
        orderId: order.id,
        kind: "instore",
        label: "Pass Caisse In-Store",
        storeName: "Course magasin",
        date: order.createdAt,
        totalEuro: order.totalSpent,
        n2oCredited: order.totalN2OCredited,
        heritiaSync,
        status: order.globalStatus,
      });
    }
  }

  return rows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function collectAssignedLinesFromOrder(order: DispatchOrder): AssignedLineItem[] {
  const driveLines = order.driveCheckouts.flatMap((checkout) => checkout.items);
  const selysLines = order.selysVoucher?.items ?? [];
  return [...driveLines, ...selysLines];
}
