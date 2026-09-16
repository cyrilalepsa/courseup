import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizationMode } from "@/types/optimizer";
import { CartOptimizer } from "./CartOptimizer";
import { N2OCalculator } from "./N2OCalculator";
import { optimizeCart } from "./optimizeCart";

interface OptimizerHubProps {
  items: IngestedItem[];
  onBack: () => void;
}

export function OptimizerHub({ items, onBack }: OptimizerHubProps) {
  const [mode, setMode] = useState<OptimizationMode>("multi-drive");
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);

  const basket = useMemo(() => optimizeCart(items, mode), [items, mode]);

  const totalLines = basket.splits.reduce((n, s) => n + s.items.length, 0);

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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;ingestion
      </button>

      <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
            <ShoppingCart className="h-5 w-5 text-emerald-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-accent/90">
              Récapitulatif panier
            </p>
            <p className="text-sm font-semibold text-white">
              {items.length} références validées · {totalLines} lignes dispatchées
            </p>
            <p className="text-xs text-slate-500">
              Mode actif :{" "}
              <span className="text-slate-300">
                {mode === "monopoly"
                  ? "Plein Monopole"
                  : mode === "multi-drive"
                    ? "Split Multi-Drives"
                    : "Hybride Selys"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <CartOptimizer items={items} mode={mode} onModeChange={setMode} basket={basket} />

      <N2OCalculator gain={basket.n2o} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Répartition par enseigne</h3>
        {basket.splits.map((split, index) => (
          <motion.article
            key={split.store.id}
            className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-r ${split.store.accentClass} px-4 py-3`}
            >
              <div>
                <p className="text-sm font-bold text-white">{split.store.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="h-3 w-3" />
                  Retrait ~{split.store.pickupMinutes} min · affiliation{" "}
                  {Math.round(split.store.affiliationRate * 100)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{split.subtotal.toFixed(2)} €</p>
                <p className="text-[10px] text-emerald-300/90">
                  +{split.affiliationCashback.toFixed(2)} € cashback
                </p>
              </div>
            </div>
            <ul className="divide-y divide-border/60 px-4 py-2">
              {split.items.map((line) => (
                <li
                  key={`${split.store.id}-${line.itemId}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="text-slate-200">
                    {line.name}{" "}
                    <span className="text-slate-500">
                      × {line.quantity} {line.unit}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-slate-300">
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
        disabled={dispatchConfirmed || items.length === 0}
        onClick={() => setDispatchConfirmed(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition ${
          dispatchConfirmed
            ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "bg-emerald-accent text-navy shadow-[0_8px_32px_-8px_rgba(16,185,129,0.55)] hover:brightness-110"
        }`}
        whileTap={{ scale: 0.98 }}
      >
        {dispatchConfirmed ? (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Dispatch N2O en file d&apos;attente
          </>
        ) : (
          <>
            Valider l&apos;optimisation &amp; Passer au Dispatch
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
