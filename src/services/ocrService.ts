import { createWorker, type Worker } from "tesseract.js";
import { parseImportedFileText, parseReceiptText } from "@/services/textParserService";
import type { IngestedItem } from "@/types/ingestion";

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
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.35 + 128));
    const threshold = contrast > 145 ? 255 : contrast < 95 ? 0 : contrast;
    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }

  ctx.putImageData(imageData, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export type OcrProgressHandler = (progress: number, status: string) => void;

export async function recognizeReceiptImage(
  file: File,
  onProgress?: OcrProgressHandler,
): Promise<{ text: string; items: IngestedItem[]; confidence: number }> {
  onProgress?.(0.05, "Pré-traitement de l'image…");
  const processed = await preprocessImageForOcr(file);

  onProgress?.(0.15, "Chargement du moteur OCR…");
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

  onProgress?.(1, "Terminé");

  return {
    text,
    items,
    confidence: ocrConfidence,
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
