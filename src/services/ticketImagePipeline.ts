export const TICKET_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

export interface TicketCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function normalizeTicketImageFile(file: File): Promise<File> {
  const name = file.name.toLowerCase();
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");
  if (!isHeic) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
  } catch {
    throw new Error("HEIC non supporté sur cet appareil — exportez en JPG.");
  }
}

export async function loadImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  const normalized = await normalizeTicketImageFile(file);
  return createImageBitmap(normalized);
}

export function applyBinarization(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contrastBoost = 1.35,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = Math.min(255, Math.max(0, (gray - 128) * contrastBoost + 128));
    const threshold = contrast > 145 ? 255 : contrast < 95 ? 0 : contrast;
    data[i] = threshold;
    data[i + 1] = threshold;
    data[i + 2] = threshold;
  }
  ctx.putImageData(imageData, 0, 0);
}

export async function preprocessTicketImage(
  file: File,
  options?: { crop?: TicketCropRect; contrastBoost?: number; maxSide?: number },
): Promise<string> {
  const bitmap = await loadImageBitmapFromFile(file);
  const canvas = document.createElement("canvas");
  const maxSide = options?.maxSide ?? 1600;
  const crop = options?.crop;

  const sourceWidth = crop ? crop.width : bitmap.width;
  const sourceHeight = crop ? crop.height : bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");

  if (crop) {
    ctx.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } else {
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

  applyBinarization(ctx, canvas.width, canvas.height, options?.contrastBoost ?? 1.35);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.92);
}
