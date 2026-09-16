import { motion } from "framer-motion";
import { Check, Sparkles, Store, Zap } from "lucide-react";
import type { DiscountSuggestion } from "@/types/discount";
import { DISCOUNT_STORE_LABELS } from "@/services/discountService";

interface DiscountSuggestionsWidgetProps {
  suggestions: DiscountSuggestion[];
  totalPotentialSavings: number;
  replaceableCount: number;
  appliedItemIds: Set<string>;
  onApplyOne: (suggestion: DiscountSuggestion) => void;
  onApplyAll: () => void;
  discountN2OBonus: number;
}

export function DiscountSuggestionsWidget({
  suggestions,
  totalPotentialSavings,
  replaceableCount,
  appliedItemIds,
  onApplyOne,
  onApplyAll,
  discountN2OBonus,
}: DiscountSuggestionsWidgetProps) {
  if (suggestions.length === 0 && appliedItemIds.size === 0) return null;

  const pending = suggestions.filter((s) => !appliedItemIds.has(s.itemId));
  const pendingSavings = pending.reduce((n, s) => n + s.savingsAmount, 0);

  return (
    <motion.section
      className="neria-card overflow-hidden border border-emerald-500/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-gradient-to-r from-emerald-600/90 to-lime-500/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-950/80">
              Suggestion discount · Lidl &amp; Aldi
            </p>
            <h3 className="mt-0.5 flex items-center gap-2 text-base font-bold text-white">
              <Store className="h-5 w-5" />
              Équivalences PGC détectées
            </h3>
          </div>
          <div className="text-right">
            <span className="neria-badge-savings text-[11px]">
              +{totalPotentialSavings.toFixed(2)} € gain potentiel
            </span>
            {discountN2OBonus > 0 && (
              <p className="mt-1.5 flex justify-end">
                <span className="neria-badge-n2o">+{discountN2OBonus} N2O discount</span>
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-emerald-950/90">
          {replaceableCount} article{replaceableCount > 1 ? "s" : ""} — basculez chez Lidl/Aldi si le trajet reste rentable.
        </p>
      </div>

      <div className="space-y-3 p-4">
        {pending.length > 0 && (
          <motion.button
            type="button"
            onClick={onApplyAll}
            className="neria-cta-primary flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="h-4 w-4" />
            Remplacer par l&apos;équivalent Lidl/Aldi ({pending.length} articles · +
            {pendingSavings.toFixed(2)} €)
          </motion.button>
        )}

        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white/80">
          {suggestions.map((s) => {
            const done = appliedItemIds.has(s.itemId);
            return (
              <li key={s.itemId} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{s.itemName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {s.referenceUnitPrice.toFixed(2)} € ({s.referenceStore}) →{" "}
                    <span className="font-medium text-emerald-800">
                      {s.discountProductName} {s.discountUnitPrice.toFixed(2)} € (
                      {DISCOUNT_STORE_LABELS[s.discountStore]})
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="neria-badge-savings">−{s.savingsAmount.toFixed(2)} €</span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Appliqué
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApplyOne(s)}
                      className="rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      Accepter
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {appliedItemIds.size > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
            {appliedItemIds.size} remplacement
            {appliedItemIds.size > 1 ? "s" : ""} actif
            {appliedItemIds.size > 1 ? "s" : ""} — recalcul multi-drives + jetons N2O mis à jour.
          </p>
        )}
      </div>
    </motion.section>
  );
}
