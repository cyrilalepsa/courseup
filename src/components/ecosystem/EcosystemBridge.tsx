import { motion } from "framer-motion";
import {
  CalendarHeart,
  Check,
  ExternalLink,
  Home,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  buildHeritiaDeeplink,
  buildMamanDouceDeeplink,
  createExportBundle,
  itemsForHeritiaExport,
  itemsForMamanDouceExport,
} from "@/services/exportService";
import { getActiveBridges, subscribeBridgeRegistry } from "@/services/bridgeRegistryService";
import type { NeriaBridgeDefinition } from "@/types/bridge";
import type { ExportBundle } from "@/types/export";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizedBasket } from "@/types/optimizer";
import {
  ecosystemToItems,
  HERITIA_IMPORT,
  MAMANDOUCE_IMPORT,
} from "@/features/ingestion/mockIngestion";

type BridgeId = string;

interface EcosystemBridgeProps {
  onItemsExtracted?: (items: IngestedItem[]) => void;
  showImport?: boolean;
  showExport?: boolean;
  exportBundle?: ExportBundle;
  items?: IngestedItem[];
  basket?: OptimizedBasket;
}

const ICONS: Record<string, typeof CalendarHeart> = {
  heritia: CalendarHeart,
  mamandouce: Home,
};

function bridgeIcon(id: string): typeof CalendarHeart {
  return ICONS[id] ?? Sparkles;
}

function supportsDirection(
  bridge: NeriaBridgeDefinition,
  direction: "import" | "export",
): boolean {
  return (
    bridge.directions.includes(direction) || bridge.directions.includes("bidirectional")
  );
}

export function EcosystemBridge({
  onItemsExtracted,
  showImport = true,
  showExport = false,
  exportBundle,
  items = [],
  basket,
}: EcosystemBridgeProps) {
  const [bridges, setBridges] = useState<NeriaBridgeDefinition[]>(() => getActiveBridges());
  const [loadingId, setLoadingId] = useState<BridgeId | null>(null);
  const [successId, setSuccessId] = useState<BridgeId | null>(null);

  useEffect(() => subscribeBridgeRegistry(setBridges), []);

  const bundle =
    exportBundle ??
    createExportBundle(basket ? "dispatch" : "ingestion", items, basket);

  const importBridge = useCallback(
    (id: BridgeId) => {
      if (!onItemsExtracted || loadingId) return;
      setLoadingId(id);
      setSuccessId(null);

      window.setTimeout(() => {
        let payload: IngestedItem[] = [];
        if (id === "heritia") {
          payload = ecosystemToItems(HERITIA_IMPORT.items, "heritia");
        } else if (id === "mamandouce") {
          payload = ecosystemToItems(MAMANDOUCE_IMPORT.items, "mamandouce");
        }
        onItemsExtracted(payload);
        setLoadingId(null);
        setSuccessId(id);
        window.setTimeout(() => setSuccessId(null), 2000);
      }, 1400);
    },
    [loadingId, onItemsExtracted],
  );

  const exportBridge = useCallback(
    (id: BridgeId) => {
      if (loadingId) return;
      setLoadingId(id);
      setSuccessId(null);

      window.setTimeout(() => {
        const bridge = getActiveBridges().find((b) => b.id === id);
        const url =
          id === "heritia"
            ? buildHeritiaDeeplink(bundle)
            : id === "mamandouce"
              ? buildMamanDouceDeeplink(bundle)
              : bridge?.exportEndpoint
                ? `${bridge.exportEndpoint}?ref=courseup`
                : "https://app.neriacorp.io/";
        window.open(url, "_blank", "noopener,noreferrer");
        setLoadingId(null);
        setSuccessId(id);
        window.setTimeout(() => setSuccessId(null), 2000);
      }, 800);
    },
    [bundle, loadingId],
  );

  const exportCounts: Record<string, number> = {
    heritia: itemsForHeritiaExport(bundle).length,
    mamandouce: itemsForMamanDouceExport(bundle).length,
  };

  const visibleBridges = bridges.filter((bridge) => {
    if (showExport) return supportsDirection(bridge, "export");
    if (showImport) return supportsDirection(bridge, "import");
    return true;
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visibleBridges.map((card, index) => {
        const Icon = bridgeIcon(card.id);
        const isLoading = loadingId === card.id;
        const isSuccess = successId === card.id;
        const exportCount = exportCounts[card.id] ?? 0;

        return (
          <motion.article
            key={card.id}
            className="neria-card flex flex-col p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <div
              className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.accentClass} border border-slate-200`}
            >
              <Icon className="h-5 w-5 text-blue-700" />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {card.appName}
              </span>
              <Sparkles className="h-3 w-3 text-violet-500" />
              {card.source === "cockpit" && (
                <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                  Cockpit
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {showExport ? card.exportTitle : card.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {showExport ? card.exportDetail : card.subtitle}
            </p>
            {!showExport && (
              <p className="mt-2 text-[11px] text-slate-600">{card.detail}</p>
            )}
            {showExport && exportCount > 0 && (
              <p className="mt-2 text-[11px] font-medium text-emerald-800">
                {exportCount} produit{exportCount > 1 ? "s" : ""} prêt
                {exportCount > 1 ? "s" : ""} à synchroniser
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4">
              {showImport && onItemsExtracted && supportsDirection(card, "import") && (
                <motion.button
                  type="button"
                  disabled={!!loadingId}
                  onClick={() => importBridge(card.id)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    isSuccess && !showExport
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-50"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading && showImport && !showExport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Synchronisation…
                    </>
                  ) : isSuccess && !showExport ? (
                    <>
                      <Check className="h-4 w-4" />
                      Importé
                    </>
                  ) : (
                    "Importer"
                  )}
                </motion.button>
              )}

              {showExport && supportsDirection(card, "export") && (
                <motion.button
                  type="button"
                  disabled={
                    !!loadingId ||
                    (exportCount === 0 &&
                      (card.id === "heritia" || card.id === "mamandouce"))
                  }
                  onClick={() => exportBridge(card.id)}
                  className="neria-cta-primary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading && showExport ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ouverture PWA…
                    </>
                  ) : isSuccess && showExport ? (
                    <>
                      <Check className="h-4 w-4" />
                      Envoyé
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Exporter vers {card.appName}
                      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
