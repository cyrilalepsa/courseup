import type { N2ReceiptOcrRequest, N2ReceiptOcrResponse } from "../../shared/n2ReceiptOcr.js";
import { parseReceiptTextToN2Response } from "./receiptOcrParser.js";

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getOcrWorker(): Promise<import("tesseract.js").Worker> {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("fra", 1, { logger: () => undefined });
  }
  return workerPromise;
}

async function recognizeImageDataUrl(imageDataUrl: string): Promise<string> {
  const worker = await getOcrWorker();
  const result = await worker.recognize(imageDataUrl);
  return result.data.text ?? "";
}

export async function processN2ReceiptOcr(
  input: N2ReceiptOcrRequest,
): Promise<N2ReceiptOcrResponse> {
  let text = input.recognizedText?.trim() ?? "";
  if (!text && input.imageDataUrl) {
    text = await recognizeImageDataUrl(input.imageDataUrl);
  }

  if (!text.trim()) {
    return {
      merchant_name: input.merchantHint ?? null,
      date_time: null,
      items: [],
      total_amount: null,
      confidence: 0,
    };
  }

  const parsed = parseReceiptTextToN2Response(text, input.merchantHint);
  if (parsed.items.length === 0) {
    const relaxed = parseReceiptTextToN2Response(
      text.replace(/([a-zA-Z])(\d)/g, "$1 $2"),
      input.merchantHint,
    );
    return relaxed;
  }
  return parsed;
}
