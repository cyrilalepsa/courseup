import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import type { IngestedItem, ItemCategory } from "@/types/ingestion";
import { createIngestedItem } from "./mockIngestion";

const CATEGORIES: ItemCategory[] = ["frais", "épicerie", "boissons", "autre"];

interface ParsedItemsPreviewProps {
  items: IngestedItem[];
  onChange: (items: IngestedItem[]) => void;
  onOptimize: () => void;
}

export function ParsedItemsPreview({ items, onChange, onOptimize }: ParsedItemsPreviewProps) {
  const updateItem = useCallback(
    (id: string, patch: Partial<IngestedItem>) => {
      onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [items, onChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange],
  );

  const addItem = useCallback(() => {
    onChange([
      ...items,
      createIngestedItem(
        { name: "Nouvel article", quantity: 1, unit: "u", category: "épicerie", confidenceScore: 1 },
        "text",
      ),
    ]);
  }, [items, onChange]);

  if (items.length === 0) {
    return null;
  }

  const validatedCount = items.length;

  return (
    <motion.section
      className="neria-card mt-6 p-4 sm:p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Articles extraits</h2>
          <p className="text-xs text-slate-600">
            Vérifiez les quantités avant l&apos;optimisation N2O
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-2 py-2 font-medium">Article</th>
              <th className="px-2 py-2 font-medium">Qté</th>
              <th className="px-2 py-2 font-medium">Unité</th>
              <th className="px-2 py-2 font-medium">Catégorie</th>
              <th className="px-2 py-2 font-medium">Conf.</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.tr
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0 }}
                  className="border-b border-slate-200/80 last:border-0"
                >
                  <td className="px-2 py-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      className="neria-input w-full min-w-[120px] px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Number(e.target.value) || 0 })
                      }
                      className="neria-input w-16 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      className="neria-input w-20 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateItem(item.id, { category: e.target.value as ItemCategory })
                      }
                      className="neria-input px-2 py-1.5 text-xs"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    {Math.round(item.confidenceScore * 100)}%
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Supprimer ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <motion.button
        type="button"
        onClick={onOptimize}
        className="neria-cta-n2o mt-5 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm"
        whileTap={{ scale: 0.98 }}
      >
        Optimiser le Panier Multi-Enseignes (N2O)
        <ArrowRight className="h-4 w-4" />
        <span className="rounded-full bg-white/40 px-2 py-0.5 text-xs font-semibold">
          {validatedCount} validés
        </span>
      </motion.button>
    </motion.section>
  );
}
