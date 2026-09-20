export interface N2ReceiptOcrItem {
  raw_label: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
}

export interface N2ReceiptOcrResponse {
  merchant_name: string | null;
  date_time: string | null;
  items: N2ReceiptOcrItem[];
  total_amount: number | null;
  confidence: number;
}

export interface N2ReceiptOcrRequest {
  imageDataUrl: string;
  recognizedText?: string;
  merchantHint?: string;
}
