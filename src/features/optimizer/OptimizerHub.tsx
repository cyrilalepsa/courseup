import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  Navigation,
  ShoppingCart,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { StoreSelector } from "@/components/store/StoreSelector";
import { useCourseUp } from "@/context/CourseUpContext";
import { getDiscountSuggestions } from "@/services/discountService";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizationMode, OptimizedBasket } from "@/types/optimizer";
import { CartOptimizer } from "./CartOptimizer";
import { N2OCalculator } from "./N2OCalculator";
import { optimizeCart, type OptimizeCartOptions } from "./optimizeCart";

interface OptimizerHubProps {
  items: IngestedItem[];
  onBack: () => void;
  onProceedToDispatch: (basket: OptimizedBasket) => void;
}

export function OptimizerHub({ items, onBack, onProceedToDispatch }: OptimizerHubProps) {
  const { selectedStores, setItems } = useCourseUp();
  const [mode, setMode] = useState<OptimizationMode>("multi-drive");
  const [discountAppliedItemIds, setDiscountAppliedItemIds] = useState<Set<string>>(
    () => new Set(),
  );

  const discountSavingsTotal = useMemo(() => {
    const summary = getDiscountSuggestions(items);
    return summary.suggestions
      .filter((s) => discountAppliedItemIds.has(s.itemId))
      .reduce((n, s) => n + s.savingsAmount, 0);
  }, [items, discountAppliedItemIds]);

  const optimizeOptions: OptimizeCartOptions = useMemo(
    () => ({
      selectedStores,
      discountAppliedItemIds: [...discountAppliedItemIds],
      discountSavingsTotal: Number(discountSavingsTotal.toFixed(2)),
    }),
    [selectedStores, discountAppliedItemIds, discountSavingsTotal],
  );

  const basket = useMemo(
    () => optimizeCart(items, mode, optimizeOptions),
    [items, mode, optimizeOptions],
  );

  const totalLines = basket.splits.reduce((n, s) => n + s.items.length, 0);

  const handleItemsChange = useCallback(
    (next: IngestedItem[]) => {
      setItems(next);
    },
    [setItems],
  );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.35 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 transition hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;ingestion
      </button>

      <StoreSelector variant="inline" />

      <div className="neria-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Récapitulatif panier
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {items.length} références validées · {totalLines} lignes dispatchées
            </p>
            <p className="text-xs text-slate-600">
              Mode actif :{" "}
              <span className="text-slate-800">
                {mode === "monopoly"
                  ? "Plein Monopole"
                  : mode === "multi-drive"
                    ? "Split Multi-Drives"
                    : "Hybride Selys"}
              </span>
            </p>
            {basket.savings.totalTripDistanceKm > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700">
                <Navigation className="h-3.5 w-3.5" />
                Distance totale estimée : {basket.savings.totalTripDistanceKm} km (aller-retour)
              </p>
            )}
          </div>
        </div>
      </div>

      <CartOptimizer
        items={items}
        mode={mode}
        onModeChange={setMode}
        basket={basket}
        optimizeOptions={optimizeOptions}
        onItemsChange={handleItemsChange}
        discountAppliedItemIds={discountAppliedItemIds}
        onDiscountAppliedChange={setDiscountAppliedItemIds}
      />

      <N2OCalculator gain={basket.n2o} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">Répartition par enseigne</h3>
        {basket.splits.map((split, index) => (
          <motion.article
            key={split.store.id}
            className="neria-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r ${split.store.accentClass} px-4 py-3`}
            >
              <div>
                <p className="text-sm font-bold text-white">
                  {split.displayName ?? split.store.name}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-white/80">
                  <MapPin className="h-3 w-3" />
                  {split.physicalStore
                    ? `${split.physicalStore.address}, ${split.physicalStore.postalCode}`
                    : `Retrait ~${split.store.pickupMinutes} min`}
                  {split.tripDistanceKm != null && split.tripDistanceKm > 0 && (
                    <span> · {split.tripDistanceKm} km</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{split.subtotal.toFixed(2)} €</p>
                <p className="text-[10px] text-cyan-100">
                  +{split.affiliationCashback.toFixed(2)} € cashback
                </p>
              </div>
            </div>
            <ul className="divide-y divide-slate-200 px-4 py-2">
              {split.items.map((line) => (
                <li
                  key={`${split.store.id}-${line.itemId}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-slate-800">
                    {line.name}{" "}
                    <span className="text-slate-600">
                      × {line.quantity} {line.unit}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">
                    {line.lineTotal.toFixed(2)} €
                  </span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>

      <motion.button
        type="button"
        disabled={items.length === 0}
        onClick={() => onProceedToDispatch(basket)}
        className="neria-cta-n2o flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm disabled:opacity-50"
        whileTap={{ scale: 0.98 }}
      >
        Valider l&apos;optimisation &amp; Passer au Dispatch
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
