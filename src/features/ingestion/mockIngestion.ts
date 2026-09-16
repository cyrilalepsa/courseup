import type { IngestedItem, IngestionItemSource } from "@/types/ingestion";

let idCounter = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function createIngestedItem(
  partial: Partial<IngestedItem> & Pick<IngestedItem, "name">,
  source: IngestionItemSource,
): IngestedItem {
  return {
    id: partial.id ?? nextId("item"),
    name: partial.name,
    quantity: partial.quantity ?? 1,
    unit: partial.unit ?? "u",
    category: partial.category ?? "épicerie",
    confidenceScore: partial.confidenceScore ?? 0.85,
    source: partial.source ?? source,
  };
}

export const MOCK_FILE_ITEMS: IngestedItem[] = [
  createIngestedItem(
    { name: "Tomates", quantity: 6, unit: "pcs", category: "frais", confidenceScore: 0.92 },
    "ocr",
  ),
  createIngestedItem(
    { name: "Pâtes penne", quantity: 500, unit: "g", category: "épicerie", confidenceScore: 0.88 },
    "ocr",
  ),
  createIngestedItem(
    { name: "Lait demi-écrémé", quantity: 1, unit: "L", category: "frais", confidenceScore: 0.95 },
    "ocr",
  ),
  createIngestedItem(
    { name: "Eau pétillante", quantity: 6, unit: "bouteilles", category: "boissons", confidenceScore: 0.81 },
    "file",
  ),
];

export const MOCK_TEXT_ITEMS: IngestedItem[] = [
  createIngestedItem(
    { name: "Oignons", quantity: 3, unit: "pcs", category: "frais", confidenceScore: 0.78 },
    "text",
  ),
  createIngestedItem(
    { name: "Riz basmati", quantity: 1, unit: "kg", category: "épicerie", confidenceScore: 0.84 },
    "text",
  ),
  createIngestedItem(
    { name: "Jus d'orange", quantity: 2, unit: "L", category: "boissons", confidenceScore: 0.76 },
    "text",
  ),
];

export const HERITIA_IMPORT = {
  id: "heritia-week",
  sourceApp: "Heritia" as const,
  title: "Menu de la semaine",
  date: "16 sept. 2026",
  itemCount: 12,
  items: [
    { name: "Poulet fermier", quantity: 1, unit: "kg", category: "frais" as const },
    { name: "Courgettes", quantity: 4, unit: "pcs", category: "frais" as const },
    { name: "Crème fraîche", quantity: 20, unit: "cl", category: "frais" as const },
    { name: "Parmesan", quantity: 150, unit: "g", category: "frais" as const },
    { name: "Saumon", quantity: 4, unit: "filets", category: "frais" as const },
    { name: "Citron", quantity: 2, unit: "pcs", category: "frais" as const },
    { name: "Quinoa", quantity: 400, unit: "g", category: "épicerie" as const },
    { name: "Épinards", quantity: 300, unit: "g", category: "frais" as const },
    { name: "Moutarde", quantity: 1, unit: "pot", category: "épicerie" as const },
    { name: "Miel", quantity: 1, unit: "pot", category: "épicerie" as const },
    { name: "Thé vert", quantity: 1, unit: "boîte", category: "boissons" as const },
    { name: "Yaourts nature", quantity: 8, unit: "pcs", category: "frais" as const },
  ],
};

export const MAMANDOUCE_IMPORT = {
  id: "mamandouce-shared",
  sourceApp: "MamanDouce" as const,
  title: "Liste de courses partagée",
  date: "Aujourd'hui",
  itemCount: 8,
  items: [
    { name: "Pain de mie", quantity: 1, unit: "paquet", category: "épicerie" as const },
    { name: "Beurre", quantity: 250, unit: "g", category: "frais" as const },
    { name: "Œufs", quantity: 12, unit: "pcs", category: "frais" as const },
    { name: "Papier toilette", quantity: 1, unit: "lot", category: "autre" as const },
    { name: "Lessive", quantity: 1, unit: "bouteille", category: "autre" as const },
    { name: "Pommes", quantity: 1, unit: "kg", category: "frais" as const },
    { name: "Café moulu", quantity: 1, unit: "paquet", category: "boissons" as const },
    { name: "Chips", quantity: 2, unit: "sachets", category: "épicerie" as const },
  ],
};

export function ecosystemToItems(
  items: Partial<IngestedItem>[],
  source: "heritia" | "mamandouce",
): IngestedItem[] {
  return items.map((item) =>
    createIngestedItem(
      {
        ...item,
        name: item.name ?? "Article",
        confidenceScore: 0.97,
      },
      source,
    ),
  );
}

export function parseTextToItems(text: string): IngestedItem[] {
  const lines = text
    .split(/\n|,|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return MOCK_TEXT_ITEMS;
  }

  return lines.map((line, index) => {
    const match = line.match(/^(\d+(?:[.,]\d+)?)\s*(\w+)?\s+(.+)$/);
    if (match) {
      const qty = parseFloat(match[1].replace(",", "."));
      const unit = match[2] ?? "u";
      const name = match[3];
      return createIngestedItem(
        { name, quantity: qty, unit, confidenceScore: 0.7 + (index % 3) * 0.08 },
        "text",
      );
    }
    return createIngestedItem({ name: line, confidenceScore: 0.72 }, "text");
  });
}
