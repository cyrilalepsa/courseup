import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizedBasket } from "@/types/optimizer";

export type ExportPhase = "ingestion" | "dispatch";

export interface ExportBundle {
  phase: ExportPhase;
  items: IngestedItem[];
  basket?: OptimizedBasket;
  order?: DispatchOrder;
  createdAt: string;
}

export type ExportResult =
  | { ok: true; method: "share" | "clipboard" | "download" }
  | { ok: false; error: string };
