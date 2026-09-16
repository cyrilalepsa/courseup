import { motion } from "framer-motion";
import { Clock, Layers, Leaf, Store, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizationMode, OptimizedBasket } from "@/types/optimizer";
import { MODE_META, optimizeCart, type OptimizeCartOptions } from "./optimizeCart";

const MODE_ICONS: Record<OptimizationMode, typeof Store> = {
  monopoly: Clock,
  "multi-drive": Layers,
  "hybrid-selys": Leaf,
};

interface CartOptimizerProps {
  items: IngestedItem[];
  mode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  basket: OptimizedBasket;
  optimizeOptions?: OptimizeCartOptions;
}

export function CartOptimizer({
  items,
  mode,
  onModeChange,
  basket,
  optimizeOptions,
}: CartOptimizerProps) {
  const modes = useMemo(
    () =>
      (Object.keys(MODE_META) as OptimizationMode[]).map((id) => ({
        id,
        ...MODE_META[id],
        preview: optimizeCart(items, id, optimizeOptions),
      })),
    [items, optimizeOptions],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Algorithme de dispatch</h2>
        <p className="text-xs text-slate-300">
          {items.length} article{items.length > 1 ? "s" : ""} validés — matching multi-enseignes
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {modes.map((m, index) => {
          const Icon = MODE_ICONS[m.id];
          const active = mode === m.id;
          return (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                active
                  ? "neria-card border-blue-500 ring-2 ring-blue-500/30"
                  : "neria-card border-transparent hover:ring-2 hover:ring-slate-300/50"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon
                  className={`h-5 w-5 ${active ? "text-blue-600" : "text-slate-500"}`}
                />
                {m.preview.savings.savingsPercent > 0 && m.id === "multi-drive" && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    <TrendingDown className="h-3 w-3" />−{m.preview.savings.savingsPercent}%
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900">{m.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{m.subtitle}</p>
              <p className="mt-2 text-[10px] font-medium text-slate-600">{m.highlight}</p>
              <p className="mt-2 text-xs text-slate-800">
                {m.preview.savings.storeCount} point{m.preview.savings.storeCount > 1 ? "s" : ""}{" "}
                · {m.preview.savings.optimizedTotal.toFixed(2)} €
              </p>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        key={mode}
        className="neria-card p-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600">Écart vs référence</p>
            <p className="text-lg font-bold text-slate-900">
              {basket.savings.savingsAmount.toFixed(2)} € économisés
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600">Panier optimisé</p>
            <p className="text-lg font-semibold text-blue-700">
              {basket.savings.optimizedTotal.toFixed(2)} €
            </p>
            <p className="text-[10px] text-slate-600">
              Réf. {basket.savings.baselineTotal.toFixed(2)} €
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-600">{basket.savings.timeScoreLabel}</p>
      </motion.div>
    </section>
  );
}
