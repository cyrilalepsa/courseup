import type { N2ReceiptOcrResponse } from "@shared/n2ReceiptOcr";
import { createWorker, type Worker } from "tesseract.js";
import { postN2ReceiptOcr } from "@/services/api/n2IngressClient";
import { preprocessTicketImage } from "@/services/ticketImagePipeline";
import { parseImportedFileText, parseReceiptText } from "@/services/textParserService";
import { matchReceiptLines } from "@/services/receiptProductMatcher";
import type { IngestedItem } from "@/types/ingestion";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("fra", 1, {
      logger: () => undefined,
    });
  }
  return workerPromise;
}

export async function preprocessImageForOcr(file: File): Promise<string> {
  return preprocessTicketImage(file);
}

export function n2ReceiptToIngestedItems(receipt: N2ReceiptOcrResponse): IngestedItem[] {
  const matched = matchReceiptLines(receipt.items);
  return matched.map((line) =>
    createIngestedItem(
      {
        name: line.matchedName,
        quantity: line.quantity,
        unit: "u",
        category: line.category,
        confidenceScore: Math.max(0.55, line.matchScore),
      },
      "ocr",
    ),
  );
}

export type OcrProgressHandler = (progress: number, status: string) => void;

export async function recognizeReceiptImage(
  file: File,
  onProgress?: OcrProgressHandler,
  processedDataUrl?: string,
): Promise<{
  text: string;
  items: IngestedItem[];
  confidence: number;
  receipt: N2ReceiptOcrResponse;
}> {
  onProgress?.(0.05, "Pré-traitement de l'image…");
  const processed = processedDataUrl ?? (await preprocessImageForOcr(file));

  onProgress?.(0.2, "Envoi vers Ingress N2…");
  const n2 = await postN2ReceiptOcr({ imageDataUrl: processed });
  if (n2 && n2.items.length > 0) {
    onProgress?.(1, "OCR N2 terminé");
    const items = n2ReceiptToIngestedItems(n2);
    return { text: "", items, confidence: n2.confidence, receipt: n2 };
  }

  onProgress?.(0.35, "Fallback OCR local…");
  const worker = await getWorker();
  const result = await worker.recognize(processed);
  onProgress?.(0.75, "Reconnaissance des caractères…");

  const text = result.data.text ?? "";
  const ocrConfidence = (result.data.confidence ?? 60) / 100;
  let items = parseReceiptText(text, "ocr");

  if (items.length === 0 && text.trim()) {
    items = parseReceiptText(text.replace(/([a-zA-Z])(\d)/g, "$1 $2"), "ocr");
  }

  items = items.map((item) => ({
    ...item,
    confidenceScore: Number(
      Math.min(0.98, Math.max(0.55, (item.confidenceScore + ocrConfidence) / 2)).toFixed(
        2,
      ),
    ),
  }));

  const receipt: N2ReceiptOcrResponse = {
    merchant_name: null,
    date_time: null,
    items: items.map((item) => ({
      raw_label: item.name,
      quantity: item.quantity,
      unit_price: null,
      total_price: null,
    })),
    total_amount: null,
    confidence: ocrConfidence,
  };

  onProgress?.(1, "Terminé");

  return {
    text,
    items,
    confidence: ocrConfidence,
    receipt,
  };
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(pageText);
  }

  return parts.join("\n");
}

export async function parseUploadedFile(
  file: File,
  onProgress?: OcrProgressHandler,
): Promise<IngestedItem[]> {
  const name = file.name.toLowerCase();

  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
    const { items } = await recognizeReceiptImage(file, onProgress);
    return items;
  }

  if (name.endsWith(".pdf")) {
    onProgress?.(0.2, "Extraction texte PDF…");
    const text = await extractTextFromPdf(file);
    onProgress?.(0.9, "Parsing du ticket…");
    return parseReceiptText(text, "file");
  }

  onProgress?.(0.4, "Lecture du fichier…");
  const text = await file.text();
  onProgress?.(0.85, "Parsing…");
  return parseImportedFileText(text, file.name);
}
