import type { ExportBundle, ExportResult } from "@/types/export";
import type { StoreSplit } from "@/types/optimizer";

const APP_LABEL = "CourseUp · NeriaCorp";

function storeDisplayName(split: StoreSplit): string {
  return split.displayName ?? split.store.name;
}

function formatSplitBlock(split: StoreSplit): string[] {
  const lines: string[] = [
    `▸ ${storeDisplayName(split)} — ${split.subtotal.toFixed(2)} €`,
  ];
  for (const line of split.items) {
    lines.push(
      `  • ${line.name} × ${line.quantity} ${line.unit} — ${line.lineTotal.toFixed(2)} €`,
    );
  }
  return lines;
}

/** Texte mis en forme pour SMS / WhatsApp / presse-papier. */
export function buildShareText(bundle: ExportBundle): string {
  const lines: string[] = [
    `🛒 ${APP_LABEL}`,
    bundle.phase === "dispatch" ? "Panier optimisé & dispatch" : "Liste de courses",
    `Généré le ${new Date(bundle.createdAt).toLocaleString("fr-FR")}`,
    "",
  ];

  if (bundle.basket) {
    const { savings, n2o } = bundle.basket;
    lines.push(
      `💰 Total optimisé : ${savings.optimizedTotal.toFixed(2)} €`,
      `✨ Économies : ${savings.savingsAmount.toFixed(2)} € (${savings.savingsPercent} %)`,
      `🎯 Jetons N2O estimés : +${n2o.pointsEarned}`,
      "",
      "— Détail par enseigne —",
    );
    for (const split of bundle.basket.splits) {
      lines.push(...formatSplitBlock(split));
    }
  } else {
    lines.push(`📋 ${bundle.items.length} article(s)`, "");
    const byCat = new Map<string, typeof bundle.items>();
    for (const item of bundle.items) {
      const list = byCat.get(item.category) ?? [];
      list.push(item);
      byCat.set(item.category, list);
    }
    for (const [cat, list] of byCat) {
      lines.push(`[${cat}]`);
      for (const item of list) {
        lines.push(`  • ${item.name} × ${item.quantity} ${item.unit}`);
      }
      lines.push("");
    }
  }

  if (bundle.order) {
    lines.push("", `Commande : ${bundle.order.id}`);
  }

  lines.push("", "Optimisé avec CourseUp — écosystème NeriaCorp");
  return lines.join("\n");
}

export interface CompactQrPass {
  v: 1;
  app: "courseup";
  ts: number;
  phase: ExportBundle["phase"];
  tot?: number;
  sav?: number;
  n2o?: number;
  ord?: string;
  splits?: { s: string; t: number; n: number }[];
  items?: { n: string; q: number; u: string }[];
}

/** Payload JSON compact pour QR caisse / borne Selys. */
export function buildQrPassPayload(bundle: ExportBundle): string {
  const pass: CompactQrPass = {
    v: 1,
    app: "courseup",
    ts: Date.parse(bundle.createdAt),
    phase: bundle.phase,
  };

  if (bundle.basket) {
    pass.tot = bundle.basket.savings.optimizedTotal;
    pass.sav = bundle.basket.savings.savingsAmount;
    pass.n2o = bundle.basket.n2o.pointsEarned;
    pass.splits = bundle.basket.splits.map((sp) => ({
      s: sp.store.id,
      t: sp.subtotal,
      n: sp.items.length,
    }));
  } else {
    pass.items = bundle.items.slice(0, 24).map((i) => ({
      n: i.name.slice(0, 48),
      q: i.quantity,
      u: i.unit.slice(0, 12),
    }));
  }

  if (bundle.order) pass.ord = bundle.order.id;

  return JSON.stringify(pass);
}

/** Fiche récapitulative texte (export .txt). */
export function buildRecapText(bundle: ExportBundle): string {
  const divider = "─".repeat(48);
  const lines: string[] = [
    APP_LABEL.toUpperCase(),
    "FICHE RÉCAPITULATIVE",
    divider,
    `Date : ${new Date(bundle.createdAt).toLocaleString("fr-FR")}`,
    `Phase : ${bundle.phase === "dispatch" ? "Dispatch validé" : "Ingestion / liste"}`,
    "",
  ];

  lines.push(buildShareText(bundle));
  lines.push("", divider, "Fin de fiche — impression ou archivage");
  return lines.join("\n");
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** PDF texte minimal (sans dépendance externe). */
export function buildRecapPdfBlob(bundle: ExportBundle): Blob {
  const recapLines = buildRecapText(bundle).split("\n").slice(0, 45);
  const contentLines = ["BT", "/F1 10 Tf", "50 780 Td", "14 TL"];
  recapLines.forEach((line, index) => {
    const prefix = index === 0 ? "" : "T* ";
    contentLines.push(`${prefix}(${pdfEscape(line.slice(0, 90))}) Tj`);
  });
  contentLines.push("ET");

  const stream = contentLines.join("\n");
  const streamLen = new TextEncoder().encode(stream).length;

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadBlob(filename: string, blob: Blob): ExportResult {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true, method: "download" };
  } catch {
    return { ok: false, error: "Téléchargement impossible" };
  }
}

export function downloadTextRecap(bundle: ExportBundle): ExportResult {
  const blob = new Blob([buildRecapText(bundle)], { type: "text/plain;charset=utf-8" });
  const stamp = new Date(bundle.createdAt).toISOString().slice(0, 10);
  return downloadBlob(`courseup-recap-${stamp}.txt`, blob);
}

export function downloadPdfRecap(bundle: ExportBundle): ExportResult {
  const stamp = new Date(bundle.createdAt).toISOString().slice(0, 10);
  return downloadBlob(`courseup-recap-${stamp}.pdf`, buildRecapPdfBlob(bundle));
}

export async function copyShareText(bundle: ExportBundle): Promise<ExportResult> {
  const text = buildShareText(bundle);
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, method: "clipboard" };
  } catch {
    return { ok: false, error: "Accès presse-papier refusé" };
  }
}

export async function copyQrPayload(bundle: ExportBundle): Promise<ExportResult> {
  const text = buildQrPassPayload(bundle);
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, method: "clipboard" };
  } catch {
    return { ok: false, error: "Accès presse-papier refusé" };
  }
}

export async function shareViaWebApi(bundle: ExportBundle): Promise<ExportResult> {
  const text = buildShareText(bundle);
  const title =
    bundle.phase === "dispatch"
      ? "Mon panier CourseUp optimisé"
      : "Ma liste CourseUp";

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return { ok: true, method: "share" };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false, error: "Partage annulé" };
      }
    }
  }

  return copyShareText(bundle);
}

export function canUseWebShare(): boolean {
  return typeof navigator.share === "function";
}

/** Produits frais pour export Heritia (frigo / DLC). */
export function itemsForHeritiaExport(bundle: ExportBundle) {
  if (bundle.basket) {
    const fresh: { name: string; quantity: number; unit: string }[] = [];
    for (const split of bundle.basket.splits) {
      for (const line of split.items) {
        const src = bundle.items.find((i) => i.id === line.itemId);
        if (src?.category === "frais" || split.store.id === "selys-local") {
          fresh.push({ name: line.name, quantity: line.quantity, unit: line.unit });
        }
      }
    }
    return fresh;
  }
  return bundle.items
    .filter((i) => i.category === "frais")
    .map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit }));
}

export function itemsForMamanDouceExport(bundle: ExportBundle) {
  if (bundle.basket) {
    const lines: { name: string; quantity: number; unit: string }[] = [];
    for (const split of bundle.basket.splits) {
      for (const line of split.items) {
        lines.push({ name: line.name, quantity: line.quantity, unit: line.unit });
      }
    }
    return lines;
  }
  return bundle.items.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
  }));
}

function base64UrlJson(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return encodeURIComponent(btoa(binary));
}

export function buildHeritiaDeeplink(bundle: ExportBundle): string {
  const payload = {
    source: "courseup",
    type: "fridge_stock",
    expiryTracking: true,
    antiWasteRecipes: true,
    purchasedAt: bundle.createdAt,
    items: itemsForHeritiaExport(bundle),
  };
  return `https://app.neriacorp.io/heritia/import?ref=courseup&payload=${base64UrlJson(payload)}`;
}

export function buildMamanDouceDeeplink(bundle: ExportBundle): string {
  const payload = {
    source: "courseup",
    type: "shared_family_list",
    cagnotteSync: true,
    items: itemsForMamanDouceExport(bundle),
  };
  return `https://app.neriacorp.io/mamandouce/sync?ref=courseup&payload=${base64UrlJson(payload)}`;
}

export function createExportBundle(
  phase: ExportBundle["phase"],
  items: ExportBundle["items"],
  basket?: ExportBundle["basket"],
  order?: ExportBundle["order"],
): ExportBundle {
  return {
    phase,
    items,
    basket,
    order,
    createdAt: new Date().toISOString(),
  };
}
