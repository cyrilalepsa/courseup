import { motion } from "framer-motion";
import { CalendarHeart, Check, Home, Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import type { IngestedItem } from "@/types/ingestion";
import {
  ecosystemToItems,
  HERITIA_IMPORT,
  MAMANDOUCE_IMPORT,
} from "./mockIngestion";

interface EcosystemBridgeProps {
  onItemsExtracted: (items: IngestedItem[]) => void;
}

type BridgeId = "heritia" | "mamandouce";

const cards: {
  id: BridgeId;
  app: string;
  title: string;
  subtitle: string;
  detail: string;
  icon: typeof CalendarHeart;
  accent: string;
}[] = [
  {
    id: "heritia",
    app: "Heritia",
    title: "Planning Repas",
    subtitle: "Importer le menu de la semaine",
    detail: "12 ingrédients extraits de 5 recettes",
    icon: CalendarHeart,
    accent: "from-rose-100 to-orange-50",
  },
  {
    id: "mamandouce",
    app: "MamanDouce",
    title: "Gestion Foyer",
    subtitle: "Importer la liste de courses partagée",
    detail: "8 produits de la maison",
    icon: Home,
    accent: "from-violet-100 to-cyan-50",
  },
];

export function EcosystemBridge({ onItemsExtracted }: EcosystemBridgeProps) {
  const [loadingId, setLoadingId] = useState<BridgeId | null>(null);
  const [successId, setSuccessId] = useState<BridgeId | null>(null);

  const importBridge = useCallback(
    (id: BridgeId) => {
      if (loadingId) return;
      setLoadingId(id);
      setSuccessId(null);

      window.setTimeout(() => {
        const payload =
          id === "heritia"
            ? ecosystemToItems(HERITIA_IMPORT.items, "heritia")
            : ecosystemToItems(MAMANDOUCE_IMPORT.items, "mamandouce");
        onItemsExtracted(payload);
        setLoadingId(null);
        setSuccessId(id);
        window.setTimeout(() => setSuccessId(null), 2000);
      }, 1400);
    },
    [loadingId, onItemsExtracted],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isLoading = loadingId === card.id;
        const isSuccess = successId === card.id;

        return (
          <motion.article
            key={card.id}
            className="neria-card flex flex-col p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <div
              className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} border border-slate-200`}
            >
              <Icon className="h-5 w-5 text-blue-700" />
            </div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {card.app}
              </span>
              <Sparkles className="h-3 w-3 text-violet-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-1 text-xs text-slate-600">{card.subtitle}</p>
            <p className="mt-2 text-[11px] text-slate-600">{card.detail}</p>

            <motion.button
              type="button"
              disabled={!!loadingId}
              onClick={() => importBridge(card.id)}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                isSuccess
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-50"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Synchronisation…
                </>
              ) : isSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  Importé
                </>
              ) : (
                "Importer"
              )}
            </motion.button>
          </motion.article>
        );
      })}
    </div>
  );
}
