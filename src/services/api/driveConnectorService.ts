import {
  DRIVE_CONNECTOR_CONFIGS,
  getDriveApiMode,
  getEnabledDriveConnectors,
} from "@/config/driveApiConfig";
import { DRIVE_MOCK_PRODUCT_CATALOG } from "@/config/driveProductCatalog";
import { itemMatchesFilter } from "@/services/filterService";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";
import type {
  DriveApiProductRecord,
  DriveProductHit,
  DriveSearchQuery,
  DriveSearchResult,
} from "@/types/driveApi";
import type { ItemAttributes } from "@/types/item";

let mockCatalog: DriveApiProductRecord[] = [...DRIVE_MOCK_PRODUCT_CATALOG];

function connectorLabel(id: string): string {
  return DRIVE_CONNECTOR_CONFIGS.find((c) => c.id === id)?.label ?? id;
}

function mapRecordToHit(record: DriveApiProductRecord): DriveProductHit {
  const isLowGlycemic =
    record.isLowGlycemic ??
    (record.glycemicIndex != null ? record.glycemicIndex <= 55 : undefined);

  const attributes: DriveProductHit["attributes"] = {
    qualityScore: record.qualityScore,
    glycemicIndex: record.glycemicIndex,
    isGlutenFree: record.isGlutenFree,
    isLowSodium: record.isLowSodium,
    isLowGlycemic,
    tags: [],
  };

  return {
    sku: record.sku,
    name: record.name,
    priceEuro: record.priceEuro,
    aisleLabel: record.aisleLabel,
    category: record.category,
    connectorId: record.connectorId,
    connectorLabel: connectorLabel(record.connectorId),
    attributes,
  };
}

function hitToIngestedProbe(hit: DriveProductHit) {
  return createIngestedItem(
    {
      name: hit.name,
      category: hit.category,
      attributes: { ...hit.attributes, tags: [...hit.attributes.tags] },
      qualityScore: hit.attributes.qualityScore,
    },
    "text",
  );
}

function matchesText(record: DriveApiProductRecord, text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q) return true;
  return (
    record.name.toLowerCase().includes(q) ||
    record.aisleLabel.toLowerCase().includes(q) ||
    record.sku.toLowerCase().includes(q)
  );
}

async function fetchLiveConnector(
  connectorId: string,
  text: string,
): Promise<DriveApiProductRecord[]> {
  const connector = getEnabledDriveConnectors().find((c) => c.id === connectorId);
  if (!connector || connector.baseUrl === "mock") return [];

  const url = `${connector.baseUrl.replace(/\/$/, "")}/search?q=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const data = (await response.json()) as { products?: DriveApiProductRecord[] };
    return (data.products ?? []).map((p) => ({ ...p, connectorId }));
  } catch {
    return [];
  }
}

export function getMockDriveCatalogSize(): number {
  return mockCatalog.length;
}

/** Simule un push catalogue API Drive (recette démo Cockpit). */
export function simulateDriveApiCatalogPush(
  incoming: DriveApiProductRecord[],
): DriveSearchResult {
  const merged = new Map(mockCatalog.map((p) => [p.sku, p]));
  for (const row of incoming) merged.set(row.sku, row);
  mockCatalog = [...merged.values()];
  return searchDriveProducts({ text: "", limit: 8 });
}

export function searchDriveProducts(query: DriveSearchQuery): DriveSearchResult {
  const mode = getDriveApiMode();
  const limit = query.limit ?? 12;
  const connectorFilter = query.connectorIds?.length
    ? new Set(query.connectorIds)
    : null;
  const text = query.text ?? "";

  let pool = mockCatalog.filter((record) => {
    if (connectorFilter && !connectorFilter.has(record.connectorId)) return false;
    return matchesText(record, text);
  });

  if (mode === "live" && text.trim().length >= 2) {
    const liveIds = connectorFilter
      ? [...connectorFilter]
      : getEnabledDriveConnectors().map((c) => c.id);
    void liveIds;
  }

  const filterIds = query.filterIds ?? [];
  if (filterIds.length > 0) {
    pool = pool.filter((record) => {
      const hit = mapRecordToHit(record);
      const probe = hitToIngestedProbe(hit);
      return filterIds.every((filterId) => itemMatchesFilter(probe, filterId));
    });
  }

  const hits = pool.slice(0, limit).map(mapRecordToHit);

  return {
    hits,
    source: mode,
    queriedAt: new Date().toISOString(),
  };
}

export function driveHitToItemAttributes(hit: DriveProductHit): ItemAttributes {
  return {
    qualityScore: hit.attributes.qualityScore,
    glycemicIndex: hit.attributes.glycemicIndex,
    isGlutenFree: hit.attributes.isGlutenFree,
    isLowSodium: hit.attributes.isLowSodium,
    isLowGlycemic: hit.attributes.isLowGlycemic,
    tags: [...hit.attributes.tags],
  };
}

export async function refreshDriveCatalogFromApis(): Promise<DriveSearchResult> {
  const mode = getDriveApiMode();
  if (mode !== "live") {
    return simulateDriveApiCatalogPush([]);
  }

  const aggregated: DriveApiProductRecord[] = [];
  for (const connector of getEnabledDriveConnectors()) {
    if (connector.baseUrl === "mock") continue;
    const rows = await fetchLiveConnector(connector.id, "");
    aggregated.push(...rows);
  }
  if (aggregated.length === 0) return searchDriveProducts({ text: "", limit: 8 });
  return simulateDriveApiCatalogPush(aggregated);
}
