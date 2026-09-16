import { motion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import type { N2OGain } from "@/types/optimizer";

interface N2OCalculatorProps {
  gain: N2OGain;
}

export function N2OCalculator({ gain }: N2OCalculatorProps) {
  const percent = Math.round(gain.conversionProgress * 100);

  return (
    <motion.section
      className="neria-card border border-violet-200/80 p-4 sm:p-5"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Mécanique N2O
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Sparkles className="h-5 w-5 text-cyan-500" />+{gain.pointsEarned} N2O
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Cashback affiliation estimé :{" "}
            <span className="font-semibold text-blue-700">{gain.cashbackEuro.toFixed(2)} €</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">{gain.bonusLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
          <p className="text-[10px] uppercase text-slate-600">Palier</p>
          <p className="text-sm font-semibold text-violet-700">{gain.tierLabel}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-slate-600">Conversion solde N2O</span>
          <span className="font-semibold text-blue-700">{percent}%</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-60" />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
          <Coins className="h-3 w-3 text-amber-500" />
          Prochain unlock dispatch premium à 600 N2O cumulés sur la commande
        </div>
      </div>
    </motion.section>
  );
}
