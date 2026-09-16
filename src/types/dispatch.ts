import type { AssignedLineItem, OptimizedBasket, PartnerStoreId } from "@/types/optimizer";

export type DispatchStatus =
  | "pending"
  | "exported"
  | "checkout_started"
  | "completed";

export interface DriveCheckoutLink {
  id: string;
  storeId: PartnerStoreId;
  storeName: string;
  items: AssignedLineItem[];
  subtotal: number;
  affiliationRate: number;
  affiliationToken: string;
  deeplinkUrl: string;
  status: DispatchStatus;
}

export interface SelysVoucher {
  id: string;
  passCode: string;
  qrPayload: string;
  merchantHub: string;
  pickupWindow: string;
  n2oApplied: number;
  subtotal: number;
  items: AssignedLineItem[];
  status: DispatchStatus;
}

export interface DispatchOrder {
  id: string;
  createdAt: string;
  mode: OptimizedBasket["mode"];
  driveCheckouts: DriveCheckoutLink[];
  selysVoucher: SelysVoucher | null;
  totalSpent: number;
  totalSavings: number;
  totalN2OCredited: number;
  globalStatus: DispatchStatus;
}

export interface DispatchStep {
  id: string;
  label: string;
  kind: "drive" | "selys";
  status: DispatchStatus;
}
