export interface HeritiaFridgeIngredient {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  purchasedAt: string;
}

export interface HeritiaFridgeExportPayload {
  schema: "neriacorp.heritia.fridge.v1";
  source: "courseup";
  purchasedAt: string;
  antiWaste: boolean;
  expiryTracking: boolean;
  items: HeritiaFridgeIngredient[];
}

export interface HeritiaSyncNotice {
  freshCount: number;
  syncedAt: string;
  status: "queued" | "delivered";
}
